// Prefer a browser-supported container; Safari may record MP4 instead of WebM.
export function recordingMimeType(supports: (mime: string) => boolean): string | undefined {
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"].find(supports);
}

export function recordingFilename(mime: string): string {
  const base = mime.split(";")[0].trim().toLowerCase();
  const extension: Record<string, string> = { "audio/mp4": "m4a", "audio/webm": "webm", "audio/ogg": "ogg", "audio/wav": "wav", "audio/mpeg": "mp3" };
  if (!extension[base]) throw new Error("浏览器返回了暂不支持的录音格式，请改用手机键盘的语音输入。");
  return `grocery-question.${extension[base]}`;
}
