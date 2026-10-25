import { loadLearningSources } from "@/lib/learning/sources";
let windowStart = 0; let requests = 0;
export async function GET(request: Request) {
  if (Date.now() - windowStart > 60000) { windowStart = Date.now(); requests = 0; }
  if (++requests > 20) return Response.json({ error: "请求较多，请一分钟后再试。" }, { status: 429 });
  try {
    const params = new URL(request.url).searchParams;
    return Response.json(await loadLearningSources(params.get("repository") ?? "", params.get("chapter") ?? undefined));
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "读取失败。" }, { status: 400 }); }
}
