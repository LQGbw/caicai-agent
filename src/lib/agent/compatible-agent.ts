import OpenAI from "openai";
import { agentDecisionJsonSchema, agentDecisionSchema } from "@/lib/domain/schemas";
import type { AgentDecision, AgentRunInput } from "@/lib/domain/types";
import type { ResolvedAiSettings } from "@/lib/settings/ai-settings";
import { effectiveProtocol, safeModelError } from "@/lib/ai/text";
import { groceryTools } from "./tool-definitions";
import { executeGroceryTool, safeToolError } from "./tool-executor";

export async function runCompatibleAgent(input: AgentRunInput, settings: ResolvedAiSettings, instructions: string): Promise<AgentDecision> {
  const anthropic = effectiveProtocol(settings) === "anthropic";
  const system = `${instructions}\n最终回答必须是以下 JSON Schema 对应的 JSON 对象，不要包 Markdown：${JSON.stringify(agentDecisionJsonSchema)}`;
  const text = input.message || "请判断图片里的食材与价格。";
  const image = input.imageDataUrl?.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  const trace: NonNullable<AgentDecision["toolTrace"]> = [];
  const chat: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: "system", content: system }, { role: "user", content: input.imageDataUrl
    ? [{ type: "text", text }, { type: "image_url", image_url: { url: input.imageDataUrl } }] : text }];
  type Block = { type: string; [key: string]: unknown };
  const messages: { role: "user" | "assistant"; content: Block[] }[] = [{ role: "user", content: [
    { type: "text", text }, ...(image ? [{ type: "image", source: { type: "base64", media_type: image[1], data: image[2] } }] : []),
  ] }];
  const client = new OpenAI({ apiKey: settings.apiKey, baseURL: settings.baseUrl, timeout: 90000, maxRetries: 0 });
  let observationSaved = false;
  for (let turn = 0; turn < 8; turn++) {
    let content = "";
    let calls: { id: string; name: string; arguments: string }[] = [];
    if (anthropic) {
      const base = (settings.baseUrl ?? "https://api.anthropic.com").replace(/\/$/, "").replace(/\/v1$/, "");
      const response = await fetch(`${base}/v1/messages`, { method: "POST", redirect: "error", signal: AbortSignal.timeout(90000),
        headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: settings.model, max_tokens: 4000, system, messages,
          tools: groceryTools.map((tool) => ({ name: tool.name, description: tool.description, input_schema: tool.parameters })) }),
      });
      if (!response.ok) throw new Error(`Anthropic 返回 ${response.status}，请检查接口协议、Key 和模型权限。`);
      const data = await response.json();
      const blocks: Block[] = data.content ?? [];
      messages.push({ role: "assistant", content: blocks });
      content = blocks.filter((block) => block.type === "text").map((block) => block.text).join("\n");
      calls = blocks.filter((block) => block.type === "tool_use").map((block) => ({ id: String(block.id), name: String(block.name), arguments: JSON.stringify(block.input) }));
    } else {
      try {
        const response = await client.chat.completions.create({ model: settings.model, messages: chat, max_tokens: 4000,
          ...(/^qwen/i.test(settings.model) ? { enable_thinking: false } : {}),
          tools: groceryTools.map((tool) => ({ type: "function" as const, function: { name: tool.name, description: tool.description, parameters: tool.parameters } })),
        });
        const message = response.choices[0]?.message;
        if (!message) throw new Error("模型返回空内容。");
        chat.push(message);
        content = message.content ?? "";
        calls = (message.tool_calls ?? []).filter((call) => call.type === "function").map((call) => ({ id: call.id, name: call.function.name, arguments: call.function.arguments }));
      } catch (error) { throw new Error(safeModelError(error)); }
    }
    if (!calls.length) return { ...agentDecisionSchema.parse(JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""))), mode: "live", observationSaved, toolTrace: trace };
    const results: Block[] = [];
    for (const call of calls) {
      let result: unknown;
      try {
        if (observationSaved && call.name === "save_price_observation") throw new Error("本轮价格已经保存。");
        result = await executeGroceryTool(call.name, call.arguments);
        if (call.name === "save_price_observation") observationSaved = true;
        trace.push({ tool: call.name, status: "success", summary: "已执行" });
      } catch (error) { result = safeToolError(call.name, error); trace.push({ tool: call.name, status: "error", summary: "工具失败" }); }
      const output = JSON.stringify(result);
      chat.push({ role: "tool", tool_call_id: call.id, content: output });
      results.push({ type: "tool_result", tool_use_id: call.id, content: output });
    }
    if (anthropic) messages.push({ role: "user", content: results });
  }
  throw new Error("工具调用已达上限，请缩短问题后重试。");
}
