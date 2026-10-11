import { NextResponse } from "next/server";
import { runGroceryAgent } from "@/lib/agent/run-agent";

export const runtime = "nodejs";

const supportedImages = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const message = String(form.get("message") ?? "").trim();
    const imageValue = form.get("image");
    const image = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;

    if (!message && !image) {
      return NextResponse.json({ error: "请说一句话或拍一张食材/价签照片。" }, { status: 400 });
    }
    if (image && (!supportedImages.has(image.type) || image.size > 8 * 1024 * 1024)) {
      return NextResponse.json({ error: "图片需为 JPG、PNG、WEBP 或 GIF，且不超过 8MB。" }, { status: 400 });
    }

    let imageDataUrl: string | undefined;
    if (image) {
      const bytes = Buffer.from(await image.arrayBuffer());
      imageDataUrl = `data:${image.type};base64,${bytes.toString("base64")}`;
    }

    const decision = await runGroceryAgent({ message, imageDataUrl });
    return NextResponse.json(decision);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "分析失败，请稍后重试。" },
      { status: 500 },
    );
  }
}
