import OpenAI from "openai";
import { agentDecisionJsonSchema, agentDecisionSchema } from "@/lib/domain/schemas";
import type { AgentDecision, AgentRunInput } from "@/lib/domain/types";
import { resolveAiSettings } from "@/lib/settings/ai-settings";
import { runDemoAgent } from "./demo-agent";
import { executeGroceryTool, safeToolError } from "./tool-executor";
import { groceryTools } from "./tool-definitions";
import { effectiveProtocol } from "@/lib/ai/text";
import { runCompatibleAgent } from "./compatible-agent";

const instructions = `你是一个只服务当前用户的买菜决策 Agent，面向做饭小白。

你的任务不是泛泛介绍食材，而是判断：这是什么、价格证据是否充分、当前用户值不值得买，以及怎样低难度保存和处理。

必须遵守：
1. 识别出食材后，先读取用户画像、个人价格历史和库存。涉及当地价格时调用公开价格工具。
2. 如果识别出明确的食材、价格和单位，查询历史后保存这次价格观察，而且每轮最多保存一次。
3. “看到价格”不是“已经购买”。绝不能因为建议购买就修改库存。
4. 不同单位、不同市场口径不可直接比较；批发价只能作为背景，不能冒充商超或菜市场零售价。
5. 少于 2 条可比个人记录且没有兼容的公开零售数据时，priceVerdict 必须为 insufficient_data，recommendation 通常为 uncertain。
6. 说明依据、样本量和置信度。宁可说不知道，也不要编造当地价格。
7. 如果图片或文字无法可靠识别，明确指出缺少什么，不要猜。
8. 回答简短、具体、适合在买菜现场阅读。最终 mode 必须为 live。`;

function buildUserContent(input: AgentRunInput) {
  const content: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: input.message.trim() || "请识别图片中的食材和价签，并判断是否值得买。",
    },
  ];
  if (input.imageDataUrl) {
    content.push({ type: "input_image", image_url: input.imageDataUrl, detail: "high" });
  }
  return [{ role: "user", content }];
}

export async function runGroceryAgent(input: AgentRunInput): Promise<AgentDecision> {
  const settings = await resolveAiSettings();
  if (!settings.apiKey) return runDemoAgent(input);
  if (effectiveProtocol(settings) !== "responses") return runCompatibleAgent(input, settings, instructions);

  const client = new OpenAI({ apiKey: settings.apiKey, baseURL: settings.baseUrl });
  const model = settings.model;
  const toolTrace: NonNullable<AgentDecision["toolTrace"]> = [];
  let response = await client.responses.create({
    model,
    instructions,
    input: buildUserContent(input) as never,
    tools: groceryTools as never,
    text: {
      format: {
        type: "json_schema",
        name: "grocery_decision",
        strict: true,
        schema: agentDecisionJsonSchema,
      },
    },
  });

  for (let turn = 0; turn < 8; turn += 1) {
    const calls = response.output.filter((item) => item.type === "function_call");
    if (calls.length === 0) {
      if (!response.output_text) throw new Error("模型没有返回可解析的购买建议。" );
      return { ...agentDecisionSchema.parse(JSON.parse(response.output_text)), toolTrace };
    }

    const outputs = await Promise.all(
      calls.map(async (call) => {
        try {
          const result = await executeGroceryTool(call.name, call.arguments);
          toolTrace.push({ tool: call.name, status: "success", summary: summarizeToolResult(call.name, result) });
          return {
            type: "function_call_output" as const,
            call_id: call.call_id,
            output: JSON.stringify(result),
          };
        } catch (error) {
          const safeError = safeToolError(call.name, error);
          toolTrace.push({ tool: call.name, status: "error", summary: safeError.error });
          return {
            type: "function_call_output" as const,
            call_id: call.call_id,
            output: JSON.stringify(safeError),
          };
        }
      }),
    );

    response = await client.responses.create({
      model,
      instructions,
      previous_response_id: response.id,
      input: outputs,
      tools: groceryTools as never,
      text: {
        format: {
          type: "json_schema",
          name: "grocery_decision",
          strict: true,
          schema: agentDecisionJsonSchema,
        },
      },
    });
  }

  throw new Error("Agent 工具调用超过 8 轮，已停止以避免循环。" );
}

function summarizeToolResult(name: string, result: unknown): string {
  if (!result || typeof result !== "object") return "已完成";
  const data = result as Record<string, unknown>;
  if (typeof data.count === "number") return `返回 ${data.count} 条记录`;
  if (data.saved === true) return "已保存价格观察";
  if (typeof data.status === "string") return `状态：${data.status}`;
  if (name === "get_user_profile") return "已读取个人画像";
  return "已完成";
}
