import { describe, expect, it, vi, afterEach } from "vitest";
import { effectiveProtocol, generateText } from "./text";

const settings = { protocol: "auto" as const, model: "claude-test", apiKey: "test-only-not-real", baseUrl: "https://provider.example/v1", transcriptionModel: "test", source: "saved" as const };
afterEach(() => vi.unstubAllGlobals());
describe("provider protocol", () => {
  it("selects explicit protocol and honors Claude auto routing", () => {
    expect(effectiveProtocol(settings)).toBe("anthropic");
    expect(effectiveProtocol({ ...settings, protocol: "chat" })).toBe("chat");
    expect(effectiveProtocol({ ...settings, model: "gpt-test" })).toBe("chat");
    expect(effectiveProtocol({ ...settings, model: "gpt-test", baseUrl: undefined })).toBe("responses");
  });
  it("sends Claude to Messages without a duplicate v1 path or leaking provider errors", async () => {
    const fetcher = vi.fn(async (url: string) => {
      expect(url).toBe("https://provider.example/v1/messages");
      return new Response(JSON.stringify({ content: [{ type: "text", text: "OK" }] }));
    });
    vi.stubGlobal("fetch", fetcher);
    expect(await generateText(settings, "test", "test", 32)).toBe("OK");
    expect(fetcher.mock.calls[0][0]).toBe("https://provider.example/v1/messages");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("secret-provider-error", { status: 401 })));
    await expect(generateText(settings, "test", "test")).rejects.toThrow("401");
    await expect(generateText({ ...settings, apiKey: undefined }, "test", "test")).rejects.toThrow(/保存/);
  });
});
