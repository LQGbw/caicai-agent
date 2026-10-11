import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "语音转写需要先配置 OPENAI_API_KEY。" }, { status: 503 });
    }
    const form = await request.formData();
    const audioValue = form.get("audio");
    if (!(audioValue instanceof File) || audioValue.size === 0) {
      return NextResponse.json({ error: "没有收到录音。" }, { status: 400 });
    }
    if (audioValue.size > 12 * 1024 * 1024) {
      return NextResponse.json({ error: "录音不能超过 12MB。" }, { status: 400 });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await client.audio.transcriptions.create({
      file: audioValue,
      model: process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe",
      language: "zh",
      prompt: "这是买菜现场的中文提问，可能包含食材、价格、重量单位和商店名称。",
    });
    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "语音转写失败。" },
      { status: 500 },
    );
  }
}
