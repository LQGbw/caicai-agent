import { z } from "zod";
import { resolveAiSettings } from "@/lib/settings/ai-settings";
import { generateText } from "@/lib/ai/text";
import { loadLearningSources, type SourceBundle } from "@/lib/learning/sources";
import { learningInstructions, toLearningPlan } from "@/lib/learning/generate";

export const runtime = "nodejs";
const inputSchema = z.object({ repository: z.string().max(500).optional(), chapter: z.string().max(250).optional(),
  material: z.string().min(40).max(60000).optional(), title: z.string().max(180).optional(), goal: z.string().max(500).optional() });
let active = false; let nextAllowed = 0;

export async function POST(request: Request) {
  if (active || Date.now() < nextAllowed) return Response.json({ error: "上一份任务正在生成，稍后再试。" }, { status: 429 });
  let ownsLock = false;
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    const reader = request.body?.getReader(); if (!reader) throw new Error("请提供资料。");
    try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
      if (size > 250000) throw new Error("资料过大，请按章节导入。"); chunks.push(part.value); } } finally { await reader.cancel(); }
    const input = inputSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const settings = await resolveAiSettings();
    if (!settings.apiKey) return Response.json({ error: "服务器尚未保存 API Key。请去设置页点击保存并测试，或先学习已整理的 Deep Agents 入门任务。" }, { status: 503 });
    if (active) return Response.json({ error: "正在生成另一份任务，请稍后重试。" }, { status: 429 });
    active = true; ownsLock = true; nextAllowed = Date.now() + 15000;
    const bundle: SourceBundle = input.repository ? await loadLearningSources(input.repository, input.chapter) : {
      title: input.title || "我的学习资料", url: "", chapters: [], coverage: "仅依据本次粘贴的资料生成，未读取其他章节。",
      sources: [{ id: "source-1", path: "用户粘贴资料", url: "https://example.invalid/pasted-material", text: input.material ?? "", revision: "" }],
    };
    if (bundle.sources.some((item) => item.text.length < 40)) throw new Error("正文不足，请提供实际章节。");
    const context = bundle.sources.map((item) => ({ id: item.id, path: item.path, text: item.text.slice(0, 25000), truncated: item.text.length > 25000 }));
    if (context.some((item) => item.truncated)) bundle.coverage += " 部分长文只读取前 25000 字符，不代表整章覆盖。";
    const output = await generateText(settings, learningInstructions, JSON.stringify({ goal: input.goal || "零基础，先理解概念，能在手机上学习", sources: context }), 6000);
    const plan = toLearningPlan(output, bundle);
    if (!input.repository) for (const task of plan.tasks) delete task.sourceUrl;
    return Response.json(plan, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof z.ZodError || error instanceof SyntaxError ? "模型输出格式不完整，未保存任务。请缩短资料或重试。"
      : error instanceof Error ? error.message : "生成失败，请重试。";
    return Response.json({ error: message }, { status: 400 });
  } finally { if (ownsLock) active = false; }
}
