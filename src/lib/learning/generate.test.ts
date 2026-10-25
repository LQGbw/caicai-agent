import { describe, expect, it, vi, afterEach } from "vitest";
import { toLearningPlan } from "./generate";
import { isOutdatedReviewedPlan, reviewedDeepAgentsPlan, upgradeReviewedLibrary } from "./reviewed-course";
import { loadLearningSources, type SourceBundle } from "./sources";
import { librarySchema, readingLabel } from "./plan";

const bundle: SourceBundle = { title: "课程", url: "https://github.com/test/course", chapters: [], coverage: "只读第一章",
  sources: [{ id: "source-1", path: "content/ch01.md", text: "可信正文", url: "https://github.com/test/course/blob/main/content/ch01.md", revision: "abc" }] };
const task = { title: "认识工具如何获取真实信息", goal: "能够解释模型与工具各自负责的任务", explanation: "天气工具返回结果后，模型才能根据实际结果组织回答，工具名称不等于已接入真实服务。".repeat(15), practice: "推演天气工具调用过程：分别说明谁提出调用，谁运行函数，以及函数结果为何必须返回模型才能形成最终回答。", answer: "模型提出工具调用及参数，框架执行函数，再把返回结果放入消息交回模型。固定演示天气只能证明调用链路，不能证明数据真实。", sourceId: "source-1" };

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
    expect(plan.tasks.every((item) => item.excerpt.length >= 500 && item.code && item.codeExplanation)).toBe(true);
    expect(JSON.stringify(plan)).not.toMatch(/咖啡|鸡腿|磨豆/);
    expect(plan.tasks[0].title).not.toContain("invoke");
    expect(plan.tasks[0].excerpt).toContain("invoke（调用）");
    expect(plan.tasks[4].excerpt).toContain("invoke 的中文意思是“调用”");
    expect(readingLabel(plan.tasks[0])).toMatch(/正文 \d+ 字 · 阅读参考/);
    expect(readingLabel({ ...plan.tasks[0], excerpt: "字".repeat(100) })).toContain("1 分钟");
    expect(readingLabel({ ...plan.tasks[0], excerpt: "字".repeat(1600) })).toContain("4–6 分钟");
  });
  it("upgrades only identified starter content without changing personal records", () => {
    const fresh = reviewedDeepAgentsPlan();
    const old = structuredClone(fresh); delete old.contentRevision;
    old.tasks[0].excerpt = "旧的短介绍";
    old.tasks[0].note = "我的原笔记"; old.tasks[0].completed = true; old.tasks[1].revisit = true;
    old.activeTaskId = old.tasks[4].id;
    const ai = { ...structuredClone(old), id: "my-ai-plan", method: "ai" as const };
    const library = librarySchema.parse({ version: 1, plans: [old, ai], activePlanId: old.id });
    const upgraded = upgradeReviewedLibrary(library, fresh);
    expect(upgraded.plans[0].id).toBe(old.id);
    expect(upgraded.plans[0].importedAt).toBe(old.importedAt);
    expect(upgraded.plans[0].activeTaskId).toBe(old.activeTaskId);
    expect(upgraded.plans[0].tasks[0]).toMatchObject({ completed: true, note: "我的原笔记" });
    expect(upgraded.plans[0].tasks[1].revisit).toBe(true);
    expect(upgraded.plans[0].tasks[0].excerpt).toBe(fresh.tasks[0].excerpt);
    expect(upgraded.plans[1]).toEqual(ai);
    expect(isOutdatedReviewedPlan(upgraded.plans[0])).toBe(false);
    expect(library.plans[0].tasks[0].excerpt).toBe("旧的短介绍");
    expect(() => upgradeReviewedLibrary(library, { ...fresh, tasks: fresh.tasks.slice(1) })).toThrow();
    expect(upgradeReviewedLibrary(upgraded, fresh)).toEqual(upgraded);
  });
  it("rejects a thin summary instead of displaying it as a complete lesson", () => {
    expect(() => toLearningPlan(JSON.stringify({ tasks: [task, task, { ...task, explanation: "只有摘要".repeat(30) }] }), bundle)).toThrow();
    const withCode = { ...task, code: "# 伪代码\ncall_tool()", codeExplanation: "这是解释执行顺序的伪代码，不是可运行 API。" };
    const plan = toLearningPlan(JSON.stringify({ tasks: [withCode, task, task] }), bundle);
    expect(plan.tasks[0].code).toBe(withCode.code);
    expect(librarySchema.parse({ version: 1, plans: [plan], activePlanId: plan.id }).plans[0].tasks[0].codeExplanation).toBe(withCode.codeExplanation);
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
