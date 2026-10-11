import { describe, expect, it } from "vitest";
import { normalizeFoodName } from "./json-repository";

describe("normalizeFoodName", () => {
  it("normalizes whitespace and case for stable matching", () => {
    expect(normalizeFoodName("  Chicken Leg  ")).toBe("chickenleg");
  });

  it("keeps Chinese food names intact", () => {
    expect(normalizeFoodName(" 鸡 腿 ")).toBe("鸡腿");
  });
});
