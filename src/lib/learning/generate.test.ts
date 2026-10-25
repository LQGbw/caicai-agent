import { describe, expect, it, vi, afterEach } from "vitest";
import { toLearningPlan } from "./generate";
import { reviewedDeepAgentsPlan } from "./reviewed-course";
import { loadLearningSources, type SourceBundle } from "./sources";
import { librarySchema } from "./plan";

const bundle: SourceBundle = { title: "课程", url: "https://github.com/test/course", chapters: [], coverage: "只读第一章",
  sources: [{ id: "source-1", path: "content/ch01.md", text: "可信正文", url: "https://github.com/test/course/blob/main/content/ch01.md", revision: "abc" }] };
const task = { title: "认识工具如何获取真实信息", goal: "能够解释模型与工具各自负责的任务", explanation: "模型不直接知道用户库存，需要调用工具读取真实记录。".repeat(8), practice: "查询历史冲煮结果时，工具应该读取哪些数据？", answer: "读取用户确认的豆子、参数和口感反馈，不编造记录。", sourceId: "source-1" };

afterEach(() => vi.unstubAllGlobals());
describe("grounded lessons", () => {
  it("rejects citations outside the material actually read", () => {
    expect(() => toLearningPlan(JSON.stringify({ tasks: [task, task, { ...task, sourceId: "invented-source" }] }), bundle)).toThrow(/未读取/);
    const plan = toLearningPlan(JSON.stringify({ tasks: [task, task, task] }), bundle);
    expect(plan.method).toBe("ai");
    expect(plan.tasks[0].sourceUrl).toBe(bundle.sources[0].url);
    expect(plan.tasks.every((item) => !item.completed)).toBe(true);
  });
  it("serves reviewed chapter lessons and preserves their fields on restore", () => {
    const plan = reviewedDeepAgentsPlan();
    expect(plan.tasks).toHaveLength(8);
    expect(plan.method).toBe("reviewed");
    expect(plan.tasks.every((item) => item.goal && item.answer && item.sourcePath?.startsWith("content/ch0"))).toBe(true);
    const restored = librarySchema.parse({ version: 1, plans: [plan], activePlanId: plan.id });
    expect(restored.plans[0].tasks[0].answer).toBe(plan.tasks[0].answer);
  });
  it("reads real content files instead of README badges", async () => {
    const fetcher = vi.fn(async (url: string) => {
      const body = url.endsWith("/contents/") ? [{ type: "dir", name: "content", path: "content" }]
        : url.endsWith("/contents/content") ? [{ type: "file", name: "ch01.md", path: "content/ch01.md" }, { type: "file", name: "ch02.md", path: "content/ch02.md" }]
        : { encoding: "base64", content: Buffer.from("# 真实章节\n" + "真实的教学正文。".repeat(10)).toString("base64"), sha: "test-sha" };
      return new Response(JSON.stringify(body), { status: 200 });
    });
    vi.stubGlobal("fetch", fetcher);
    const result = await loadLearningSources("https://github.com/unit-test/unique-course");
    expect(result.sources).toHaveLength(2);
    expect(result.sources[0].text).toContain("真实的教学正文");
    expect(result.sources.every((source) => !source.path.includes("README"))).toBe(true);
    await expect(loadLearningSources("https://github.com/unit-test/unique-course", "content/../../secret.md")).rejects.toThrow(/路径/);
  });
});
