import { NextResponse } from "next/server";
import { profileUpdateSchema } from "@/lib/domain/schemas";
import { groceryRepository } from "@/lib/storage/json-repository";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await groceryRepository.getProfile());
}

export async function PATCH(request: Request) {
  try {
    const update = profileUpdateSchema.parse(await request.json());
    return NextResponse.json(await groceryRepository.updateProfile(update));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "画像保存失败。" },
      { status: 400 },
    );
  }
}
