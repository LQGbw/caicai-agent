import { z } from "zod";

export const taskSchema = z.object({
  id: z.string().max(80), title: z.string().max(180),
  excerpt: z.string().max(1200), sourceLine: z.number().int().positive(),
  practice: z.string().max(300), completed: z.boolean(), revisit: z.boolean(),
  note: z.string().max(2000),
});
export const planSchema = z.object({
  id: z.string().max(80), title: z.string().max(180),
  sourceUrl: z.string().url().max(600).nullable(),
  importedAt: z.string(), tasks: z.array(taskSchema).min(1).max(120),
  activeTaskId: z.string().nullable(),
});
export const librarySchema = z.object({
  version: z.literal(1), plans: z.array(planSchema).max(10), activePlanId: z.string().nullable(),
});
export type LearningPlan = z.infer<typeof planSchema>;
export type LearningTask = z.infer<typeof taskSchema>;
export type LearningLibrary = z.infer<typeof librarySchema>;
export const emptyLibrary: LearningLibrary = { version: 1, plans: [], activePlanId: null };
export const storageKey = "practice-learning-v1";

export function parseRepository(value: string): { owner: string; repo: string; url: string } {
  const url = new URL(value.trim());
  const parts = url.pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port || url.username || url.password
    || parts.length !== 2 || parts.some((part) => !/^[A-Za-z0-9_.-]+$/.test(part))) {
    throw new Error("请输入公开仓库首页，例如 https://github.com/用户/项目；也可以直接粘贴资料。");
  }
  const [owner, rawRepo] = parts;
  const repo = rawRepo.replace(/\.git$/, "");
  if (!repo || repo === "." || repo === ".." || owner === "." || owner === "..") throw new Error("仓库地址无效。");
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

function practiceFor(title: string): string {
  if (/install|setup|quick.?start|安装|部署|启动/i.test(title)) return "找出这一节的一个前置条件和第一步操作，写下你还缺什么。现在不方便操作时，不必执行命令。";
  if (/architect|design|workflow|架构|原理|流程/i.test(title)) return "用自己的话写出这一节的输入、主要处理步骤和输出；不确定的部分标记为待复习。";
  if (/example|usage|api|示例|使用|接口/i.test(title)) return "从原文选一个示例，写下它接收什么、返回什么，以及你会在什么时候使用。";
  return "不看原文，用一句话复述这一节的要点，再写一个你会用到它的具体问题。";
}

export function createLearningPlan(text: string, title: string, sourceUrl: string | null = null): LearningPlan {
  if (text.trim().length < 40) throw new Error("资料太短，请提供至少 40 个字符的正文。");
  if (text.length > 60000) throw new Error("这次最多导入 6 万字符，请按章节分批学习。");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const tasks: LearningTask[] = [];
  let heading = "项目概览";
  let buffer: string[] = [];
  let start = 1;
  let fence: string | null = null;
  const flush = () => {
    const excerpt = buffer.join("\n").trim();
    if (excerpt.length >= 20) tasks.push({
      id: crypto.randomUUID(), title: heading.slice(0, 180), excerpt,
      sourceLine: start, practice: practiceFor(heading), completed: false, revisit: false, note: "",
    });
    buffer = [];
  };
  lines.forEach((line, index) => {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker) fence = fence ? (marker[0] === fence[0] && marker.length >= fence.length ? null : fence) : marker;
    const match = !fence && /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) {
      flush(); heading = match[2].replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); start = index + 2;
    } else {
      // Bound each reading slice, including long unbroken lines. Do not run source code or render source HTML.
      for (let offset = 0; offset < Math.max(1, line.length); offset += 900) {
        const part = line.slice(offset, offset + 900);
        if (buffer.join("\n").length + part.length > 1000) { flush(); start = index + 1; }
        if (!buffer.length) start = index + 1;
        buffer.push(part);
      }
    }
  });
  flush();
  if (!tasks.length) throw new Error("没有找到足够的正文，请粘贴实际学习内容，而不是只有目录或链接。");
  if (tasks.length > 120) throw new Error("资料章节过多，请按章节分批导入。");
  return planSchema.parse({
    id: crypto.randomUUID(), title: title.trim().slice(0, 180) || "我的学习资料",
    sourceUrl, importedAt: new Date().toISOString(), tasks, activeTaskId: tasks[0].id,
  });
}

export const sampleMaterial = `# 理解一个带工具的助手
一个助手收到问题后，先理解用户想完成什么。如果需要最新数据或个人状态，它可以请求工具提供信息。工具返回结果后，助手再形成建议。
## 工具与模型的分工
模型负责提出调用哪个工具及参数，应用代码负责校验参数和真正执行。比如模型请求查询库存，但只有通过校验的查询才能访问存储。模型不能直接改写库存文件。
## 观察不等于确认
看到一张鸡腿价签，只能形成价格观察。用户明确确认买下之后，才能增加购买记录和库存。推荐购买也不能替代实际购买。
## 长期经验如何产生
用户可以反馈食材是否用完、哪一步处理困难。下一次建议读取这些真实结果，就能减少重复提问。一次勾选只代表用户报告完成，不代表已经掌握技能。`;
