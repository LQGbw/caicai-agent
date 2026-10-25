import OpenAI from "openai";
import type { ResolvedAiSettings } from "@/lib/settings/ai-settings";

export function effectiveProtocol(settings: ResolvedAiSettings) {
  if (settings.protocol !== "auto") return settings.protocol;
  if (/claude/i.test(settings.model)) return "anthropic";
  return settings.baseUrl ? "chat" : "responses";
}

export function safeModelError(error: unknown): string {
  const status = error instanceof OpenAI.APIError ? error.status : undefined;
  if (status === 401 || status === 403) return "服务商拒绝了请求，请检查 Key、额度和模型权限。";
  if (status === 404) return "API 地址或模型 ID 不匹配，请在设置中检查接口协议。";
  if (status === 429) return "服务商额度不足或请求过快，请稍后重试。";
  return "模型调用失败，请检查接口协议、模型 ID 和网络。原始错误未公开，以免泄露配置。";
}

export async function generateText(settings: ResolvedAiSettings, system: string, user: string, maxTokens = 4500): Promise<string> {
  if (!settings.apiKey) throw new Error("请先在设置页保存 API Key，再测试连接。");
  const protocol = effectiveProtocol(settings);
  if (protocol === "anthropic") {
    const base = (settings.baseUrl ?? "https://api.anthropic.com").replace(/\/$/, "");
    const url = `${base.replace(/\/v1$/, "")}/v1/messages`;
    const response = await fetch(url, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(90000),
      headers: { "Content-Type": "application/json", "x-api-key": settings.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: settings.model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
    if (!response.ok) throw new Error(`Anthropic 接口返回 ${response.status}，请检查 API 地址、Key 与模型权限。`);
    const data = await response.json();
    return (data.content ?? []).filter((item: { type: string }) => item.type === "text").map((item: { text: string }) => item.text).join("\n");
  }
  const client = new OpenAI({ apiKey: settings.apiKey, baseURL: settings.baseUrl, timeout: 90000, maxRetries: 0 });
  try {
    if (protocol === "responses") {
      const response = await client.responses.create({ model: settings.model, instructions: system, input: user, max_output_tokens: maxTokens });
      return response.output_text;
    }
    const response = await client.chat.completions.create({
      model: settings.model, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: maxTokens,
      ...(/^qwen/i.test(settings.model) ? { enable_thinking: false } : {}),
    });
    return response.choices[0]?.message.content ?? "";
  } catch (error) { throw new Error(safeModelError(error)); }
}
