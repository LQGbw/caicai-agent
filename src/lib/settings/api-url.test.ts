import { describe, expect, it } from "vitest";
import { apiBaseUrlSchema } from "./api-url";

describe("API base URL input", () => {
  it("normalizes pasted whitespace, missing scheme and endpoint paths", () => {
    expect(apiBaseUrlSchema.parse("  api.example.com/v1/chat/completions  ")).toBe("https://api.example.com/v1");
    expect(apiBaseUrlSchema.parse("https://api.example.com/v1/messages")).toBe("https://api.example.com/v1");
    expect(apiBaseUrlSchema.parse("  ")).toBe("");
    expect(apiBaseUrlSchema.parse("https://dashscope.aliyuncs.com/compatible-mode/v1")).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1");
  });
  it("explains invalid input without admitting credentials in URLs", () => {
    for (const value of ["http://api.example.com", "https://name:key@api.example.com", "https://api.example.com?key=secret", "qwen-flash", "https:// bad url"]) {
      const result = apiBaseUrlSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].message).toMatch(/API|地址/);
    }
  });
});
