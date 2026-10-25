import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/settings/ai-settings", () => ({ resolveAiSettings: async () => ({
  apiKey: "test-key-not-real", baseUrl: "https://provider.example/v1", model: "qwen-test",
  transcriptionModel: "transcribe-test", protocol: "chat", source: "saved",
}) }));
afterEach(() => vi.unstubAllGlobals());

function recordingRequest(type: string, name: string) {
  const form = new FormData();
  form.append("audio", new File([new Uint8Array([1, 2, 3])], name, { type }));
  return new Request("http://localhost/api/transcribe", { method: "POST", body: form });
}

describe("transcription boundary", () => {
  it("accepts an MP4 upload without forcing it into a WebM filename", async () => {
    const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ text: "今天鸡腿九块九一斤" }), { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(recordingRequest("audio/mp4", "question.m4a"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "今天鸡腿九块九一斤" });
    // The SDK also probes FormData support with a data: URL, which is not a model request.
    const requests = fetcher.mock.calls.filter(([input]) => String(input).startsWith("https://provider.example/"));
    expect(requests).toHaveLength(1);
    const requestBody = requests[0][1]!.body as FormData;
    expect((requestBody.get("file") as File).name).toBe("question.m4a");
  });
  it("does not return raw upstream errors, credentials or retry a missing model", async () => {
    const fetcher = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ error: { message: "secret-upstream-data", code: "model_not_found", type: "packy_api_error" } }), { status: 503, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(recordingRequest("audio/wav", "question.wav"));
    expect(response.status).toBe(502);
    const result = await response.text();
    expect(result).toContain("未提供");
    expect(result).not.toMatch(/secret-upstream|test-key/);
    expect(fetcher.mock.calls.filter(([input]) => String(input).startsWith("https://provider.example/"))).toHaveLength(1);
  });
});
