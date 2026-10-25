import OpenAI from "openai";
import { NextResponse } from "next/server";
import { resolveAiSettings } from "@/lib/settings/ai-settings";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const settings = await resolveAiSettings();
    if (!settings.apiKey) {
      return NextResponse.json({ error: "请先在 API 设置页配置 Key。" }, { status: 503 });
    }
    const form = await request.formData();
    const audioValue = form.get("audio");
    if (!(audioValue instanceof File) || audioValue.size === 0) {
      return NextResponse.json({ error: "没有收到录音。" }, { status: 400 });
    }
    if (audioValue.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "录音不能超过 12MB。" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: settings.apiKey, baseURL: settings.baseUrl, timeout: 60000, maxRetries: 0 });
    const transcription = await client.audio.transcriptions.create({
      file: audioValue,
      model: settings.transcriptionModel,
      language: "zh",
      prompt: "这是买菜现场的中文提问，可能包含食材、价格、重量单位和商店名称。",
    });
    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    const code = error instanceof OpenAI.APIError ? error.code : undefined;
    const status = error instanceof OpenAI.APIError ? error.status : undefined;
    const message = code === "model_not_found" || status === 404
      ? "当前服务商未提供已配置的语音转写模型。对话模型不能直接替代；请改用手机键盘语音输入，或在设置中配置可用的转写模型。"
      : status === 401 || status === 403 ? "语音服务认证失败，请检查设置中的 Key 与模型权限。"
      : status === 400 ? "服务商不支持当前转写模型或录音格式。请检查语音模型配置，或改用手机键盘语音输入。"
      : "语音转写暂不可用，请稍后重试，或改用手机键盘的语音输入。";
    return NextResponse.json(
      { error: message },
      { status: 502 },
    );
  }
}
