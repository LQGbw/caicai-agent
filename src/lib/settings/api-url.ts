import { z } from "zod";

export const apiBaseUrlSchema = z.string().max(500, "API 地址过长。").transform((input, context) => {
  let value = input.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!value) return "";
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("API 地址必须使用 https://，请使用服务商的 HTTPS 地址。");
    if (url.username || url.password || url.search || url.hash) throw new Error("API 地址不能包含账号、密码、查询参数或 #。Key 请填在单独的 Key 栏。");
    if (!url.hostname.includes(".")) throw new Error("API 地址应是服务商提供的完整域名，例如 https://api.example.com/v1。");
    url.pathname = url.pathname.replace(/\/(?:chat\/completions|responses|messages)\/?$/, "").replace(/\/$/, "");
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    context.addIssue({ code: "custom", message: error instanceof TypeError
      ? "API 地址格式不正确。请填写服务商提供的地址，例如 https://api.example.com/v1；不要填写模型名称或文档地址。"
      : (error as Error).message });
    return z.NEVER;
  }
});
