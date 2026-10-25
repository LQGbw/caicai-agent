import { parseRepository } from "@/lib/learning/plan";

export const runtime = "nodejs";
const cache = new Map<string, { expires: number; data: { title: string; url: string; text: string } }>();
let windowStart = 0;
let requests = 0;

async function limitedText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("GitHub 没有返回正文。");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 300000) throw new Error("README 太大，请复制其中一个章节后分批导入。");
      chunks.push(chunk.value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString("utf8");
}

export async function GET(request: Request) {
  try {
    const repository = parseRepository(new URL(request.url).searchParams.get("repository") ?? "");
    const now = Date.now();
    const cached = cache.get(repository.url);
    if (cached && cached.expires > now) return Response.json(cached.data);
    if (now - windowStart > 60000) { windowStart = now; requests = 0; }
    if (++requests > 20) return Response.json({ error: "导入请求较多，请一分钟后再试，或粘贴资料。" }, { status: 429 });
    const response = await fetch(`https://api.github.com/repos/${repository.owner}/${repository.repo}/readme`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "Practice-Learning-Demo" },
      signal: AbortSignal.timeout(15000), redirect: "error", cache: "no-store",
    });
    if (!response.ok) return Response.json({ error: response.status === 404
      ? "没有找到公开仓库的 README；私有仓库请直接粘贴资料。"
      : "GitHub 暂时不可用或达到访问额度，请稍后重试，或直接粘贴资料。" }, { status: 502 });
    const raw = JSON.parse(await limitedText(response));
    if (raw.encoding !== "base64" || typeof raw.content !== "string") throw new Error("无法读取 README，请直接粘贴资料。");
    const text = Buffer.from(raw.content, "base64").toString("utf8");
    if (text.length > 60000) throw new Error("README 超过 6 万字符，请按章节粘贴导入。");
    const data = { title: `${repository.owner}/${repository.repo}`, url: `${repository.url}#readme`, text };
    if (cache.size >= 20) cache.delete(cache.keys().next().value!);
    cache.set(repository.url, { data, expires: now + 600000 });
    return Response.json(data);
  } catch (error) {
    const message = error instanceof Error && /请输入|仓库地址|README|正文/.test(error.message)
      ? error.message : "读取超时或资料地址无效，请检查链接，或直接粘贴正文。";
    return Response.json({ error: message }, { status: 400 });
  }
}
