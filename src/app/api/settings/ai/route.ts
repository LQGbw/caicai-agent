import { NextResponse } from "next/server";
import { getPublicAiSettings, updateAiSettings } from "@/lib/settings/ai-settings";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getPublicAiSettings());
}

export async function PATCH(request: Request) {
  try {
    return NextResponse.json(await updateAiSettings(await request.json()));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "API 设置保存失败。" },
      { status: 400 },
    );
  }
}
