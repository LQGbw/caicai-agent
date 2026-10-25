import { describe, expect, it } from "vitest";
import { recordingFilename, recordingMimeType } from "./recording";

describe("mobile recording containers", () => {
  it("selects a supported format and uses its actual filename extension", () => {
    expect(recordingMimeType((mime) => mime === "audio/mp4")).toBe("audio/mp4");
    expect(recordingFilename("audio/mp4;codecs=mp4a.40.2")).toBe("grocery-question.m4a");
    expect(recordingMimeType((mime) => mime.includes("webm"))).toBe("audio/webm;codecs=opus");
    expect(recordingFilename("audio/webm;codecs=opus")).toBe("grocery-question.webm");
    expect(recordingMimeType(() => false)).toBeUndefined();
    expect(() => recordingFilename("application/octet-stream")).toThrow(/录音格式/);
  });
});
