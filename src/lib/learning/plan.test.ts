import { describe, expect, it } from "vitest";
import { createLearningPlan, librarySchema, parseRepository } from "./plan";

describe("public learning source boundaries", () => {
  it("accepts a public repository but rejects arbitrary hosts and paths", () => {
    expect(parseRepository("https://github.com/LQGbw/caicai-agent.git").repo).toBe("caicai-agent");
    for (const value of ["http://github.com/a/b", "https://github.com.evil.test/a/b", "https://127.0.0.1/a/b", "https://github.com/a/b/blob/main/x", "https://x:secret@github.com/a/b", "https://github.com:8080/a/b"]) {
      expect(() => parseRepository(value)).toThrow();
    }
  });
  it("keeps fenced headings as source material and starts with no mastery claim", () => {
    const text = "# 工具学习\n" + "理解工具如何读取状态，以及应用如何校验输入。".repeat(8) + "\n```md\n## 这是代码块里的示例标题\n```\n## 安装\n" + "先检查运行条件，不要在不知道含义时执行命令。".repeat(8);
    const plan = createLearningPlan(text, "工具项目");
    expect(plan.tasks).toHaveLength(2);
    expect(plan.tasks[0].excerpt).toContain("## 这是代码块里的示例标题");
    expect(plan.tasks[1].title).toBe("安装");
    expect(plan.tasks.every((task) => !task.completed && !task.revisit && task.note === "")).toBe(true);
    plan.tasks[0].completed = true;
    plan.tasks[0].note = "我的复述";
    const restored = librarySchema.parse(JSON.parse(JSON.stringify({ version: 1, plans: [plan], activePlanId: plan.id })));
    expect(restored.plans[0].tasks[0].note).toBe("我的复述");
    expect(restored.plans[0].tasks[0].completed).toBe(true);
  });
  it("bounds reading slices and rejects oversized material without silent truncation", () => {
    const plan = createLearningPlan("概念说明".repeat(1500), "长文");
    expect(plan.tasks.length).toBeGreaterThan(1);
    expect(plan.tasks.every((task) => task.excerpt.length <= 1200)).toBe(true);
    expect(plan.tasks.map((task) => task.excerpt).join("").replace(/\n/g, "")).toBe("概念说明".repeat(1500));
    expect(() => createLearningPlan("概".repeat(60001), "过长资料")).toThrow();
  });
});
