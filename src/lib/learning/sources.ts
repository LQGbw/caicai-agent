import { parseRepository } from "./plan";

export interface LearningSource { id: string; path: string; url: string; text: string; revision: string }
export interface SourceBundle { title: string; url: string; sources: LearningSource[]; chapters: { path: string; title: string }[]; coverage: string }
const cache = new Map<string, { expires: number; data: SourceBundle }>();

async function githubJson(owner: string, repo: string, path: string) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "Practice-Learning-Demo" },
    redirect: "error", signal: AbortSignal.timeout(15000), cache: "no-store",
  });
  if (!response.ok) throw new Error(response.status === 404 ? "没有找到公开课程正文，请粘贴具体章节。" : "GitHub 暂时不可用或额度已用完，请稍后重试。");
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) { const item = await reader.read(); if (item.done) break; length += item.value.byteLength;
      if (length > 500000) throw new Error("资料过大，请分章节导入。"); chunks.push(item.value); }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function loadLearningSources(repositoryUrl: string, selectedPath?: string): Promise<SourceBundle> {
  const { owner, repo, url } = parseRepository(repositoryUrl);
  if (selectedPath && (!/^(?:content|docs)\/[A-Za-z0-9_./\-\u4e00-\u9fff]+\.md$/i.test(selectedPath) || selectedPath.split("/").some((part) => part === ".." || part === "."))) throw new Error("章节路径无效。");
  const key = `${url}:${selectedPath ?? "first"}`;
  const hit = cache.get(key); if (hit && hit.expires > Date.now()) return hit.data;
  const root = await githubJson(owner, repo, "");
  if (!Array.isArray(root)) throw new Error("无法读取仓库目录。");
  const dir = root.find((item) => item.type === "dir" && item.name === "content")?.path
    ?? root.find((item) => item.type === "dir" && item.name === "docs")?.path;
  let paths: string[] = [];
  if (dir) {
    const entries = await githubJson(owner, repo, dir);
    if (Array.isArray(entries)) paths = entries.filter((item) => item.type === "file" && /\.md$/i.test(item.name) && !/^readme/i.test(item.name)).map((item) => item.path);
  }
  paths.sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
  const chapters = paths.map((path) => ({ path, title: path.replace(/^.*\//, "").replace(/\.md$/i, "") }));
  if (selectedPath && !paths.includes(selectedPath)) throw new Error("没有在课程目录中找到所选章节。");
  const selected = selectedPath ? [selectedPath] : paths.slice(0, 2);
  if (!selected.length) {
    const readme = root.find((item) => item.type === "file" && /^readme\.md$/i.test(item.name));
    if (!readme) throw new Error("没有找到 Markdown 正文，请粘贴实际章节内容。");
    selected.push(readme.path);
  }
  const sources = await Promise.all(selected.map(async (path, index) => {
    const raw = await githubJson(owner, repo, path);
    if (raw.encoding !== "base64" || typeof raw.content !== "string") throw new Error("章节格式不支持，请粘贴正文。");
    const text = Buffer.from(raw.content, "base64").toString("utf8");
    if (text.length > 45000) throw new Error("单章过长，请粘贴其中一节学习。");
    const firstHeading = /^#\s+(.+)$/m.exec(text)?.[1];
    const chapter = chapters.find((item) => item.path === path); if (chapter && firstHeading) chapter.title = firstHeading;
    return { id: `source-${index + 1}`, path, url: `${url}/blob/${raw.sha ? "HEAD" : "main"}/${path}`, revision: String(raw.sha ?? ""), text };
  }));
  const data = { title: `${owner}/${repo}`, url, sources, chapters, coverage: paths.length
    ? `发现 ${paths.length} 篇章节文档，本次实际读取：${selected.join("、")}。其余章节尚未读取，可随后单独选择。`
    : "只找到 README。本次仅依据 README，未阅读完整源码或其他链接。" };
  if (cache.size >= 12) cache.delete(cache.keys().next().value!);
  cache.set(key, { data, expires: Date.now() + 600000 });
  return data;
}
