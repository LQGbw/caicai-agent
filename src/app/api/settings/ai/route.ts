import { NextResponse } from "next/server";
import { getPublicAiSettings, updateAiSettings } from "@/lib/settings/ai-settings";
import { z } from "zod";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getPublicAiSettings());
}

export async function PATCH(request: Request) {
  try {
    return NextResponse.json(await updateAiSettings(await request.json()));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof z.ZodError ? error.issues.map((issue) => `${issue.path[0] === "apiKey" ? "API Key" : issue.path[0] === "baseUrl" ? "API 地址" : "模型设置"}：${issue.message}`).join("；")
        : error instanceof Error && "code" in error && error.code === "EACCES" ? "服务器数据目录不可写，配置未保存，请联系维护者。" : "API 设置保存失败，请检查字段并重试。" },
      { status: 400 },
    );
  }
}
