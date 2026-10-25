import { generateText, effectiveProtocol } from "@/lib/ai/text";
import { resolveAiSettings } from "@/lib/settings/ai-settings";

export async function POST() {
  try {
    const settings = await resolveAiSettings();
    if (!settings.apiKey) return Response.json({ error: "服务器尚未保存 Key，请先点击保存。" }, { status: 400 });
    const text = await generateText(settings, "This is a connectivity check. Reply with OK.", "Reply OK.", 32);
    if (!text.trim()) throw new Error("模型返回了空内容，请检查模型是否适用于文本任务。");
    return Response.json({ ok: true, model: settings.model, protocol: effectiveProtocol(settings) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "连接测试失败。" }, { status: 502 });
  }
}
