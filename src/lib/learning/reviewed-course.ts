import { planSchema, type LearningPlan } from "./plan";

// Editorial starter lessons based on ch01 and ch02, not model-generated or a full-course summary.
// Course attribution: datawhalechina/deepagents-in-action, CC BY-NC-SA 4.0 (text).
const lessons = [
  { chapter: 1, title: "先认识 Agent：回答之后，还能做什么？", goal: "区分一次模型回答与模型、工具交替执行的过程。",
    excerpt: "假设你问助手：家里还有鸡腿吗？语言模型本身不知道你的冰箱库存。它可以提出调用“查询库存”工具，由应用读取真实记录，再把结果交给模型形成建议。\n\n一个常见的 Agent 过程是：收到问题 → 模型决定是否调用工具 → 应用执行工具 → 结果回到上下文 → 模型继续判断。直到无需调用工具，才给出最终回答。并非每个问题都需要工具，也并非调用一次 Agent 就只请求一次模型。",
    practice: "如果你问“这包咖啡豆我上次冲出来怎么样”，助手需要读取什么真实记录？只靠模型记得住吗？",
    answer: "需要读取你对这包豆子的冲煮参数和口感反馈。模型负责理解问题与组织建议，记录需要应用持久保存、按需读取。" },
  { chapter: 1, title: "LangGraph、LangChain、Deep Agents，分别管什么？", goal: "按职责理解三层关系，而不是背框架名称。",
    excerpt: "这门课程把三者解释为叠加的层次。LangGraph 偏重执行与状态：流程走到哪里、在哪里暂停、如何恢复。LangChain 提供模型、工具、中间件和 Agent 循环等开发接口。Deep Agents 在它们之上装配文件操作、上下文管理和任务委派等能力。\n\n用购买确认举例：查询库存是业务工具；模型决定是否查询属于 Agent 循环；等你确认买下后再继续，需要可暂停、恢复的流程。采用框架后，业务仍要自己定义什么才算“确认购买”。",
    practice: "把“查询库存”“等待确认后继续”“装配现成文件工具”分别对应到业务工具、执行流程、Harness 能力。",
    answer: "查询库存由应用实现业务工具；等待和恢复由执行流程组织；Deep Agents 可以装配文件工具等 Harness 能力。三层可组合，不是只能三选一。" },
  { chapter: 1, title: "为什么不把所有资料一次塞给模型？", goal: "理解上下文工程解决的信息选择问题。",
    excerpt: "学习一个仓库时，把所有文件一次放进提示词会占用大量上下文，也会让当前要点被无关内容淹没。课程介绍的做法是：先查目录，需要时再读具体文件，把中间结果留在合适的存储中。\n\n例如你只想理解“工具怎么定义”，当前应读工具定义及其调用示例，而不是课程徽章、贡献者列表和所有进阶章节。文件工具让内容可以按需获取；存储后端决定这些内容实际放在哪里。",
    practice: "你现在学习第一个 Agent，先选两个最该阅读的内容：工具调用示例、所有贡献者名单、最小运行示例、整套部署截图。",
    answer: "优先工具调用示例与最小运行示例。上下文工程关注当前任务需要什么、如何获取和保留这些信息。" },
  { chapter: 1, title: "分清运行记录与长期记忆", goal: "知道“这次做到哪里”和“以后还应记得什么”是两种数据。",
    excerpt: "一次活动的执行位置和跨活动的个人经验用途不同。咖啡任务做到调磨豆机这一步，是当前活动状态；你偏好少苦味、上次某个研磨参数效果好，是以后也可能要用的记录。\n\n课程在架构说明中区分线程状态与跨线程数据，并介绍通过 Checkpointer、Store 和后端配置支持保存。采用框架不会自动决定哪些内容可信；用户自述、实际操作与模型推测仍需业务区分。",
    practice: "“第 2 个任务还没完成”和“这包豆子我觉得太酸”各应作为哪类记录？",
    answer: "前者是当前学习或活动进度；后者是用户的口感自述，可作为跨活动经验。它不是客观测量，更不能改写成所有人都觉得酸。" },
  { chapter: 2, title: "看懂第一个 Agent 的三个输入", goal: "识别 model、tools、system_prompt 的分工。",
    excerpt: "第 2 章用 create_deep_agent 创建助手。先不运行代码，只读三个参数：model 是接入哪个模型；tools 是应用允许调用的函数；system_prompt 说明目标与回答边界。\n\n例如咖啡助手可以接一个模型，注册“查询冲煮记录”工具，再用提示词要求引用实际记录。提示词写“你可以查询库存”，并不会凭空建立数据库或实现查询函数。课程示例的密钥与依赖安装属于电脑实操，可以等方便时再做。",
    practice: "如果想让助手查询真实库存，只修改提示词够不够？还要准备什么？",
    answer: "不够。应用需要实现并注册工具、连接库存记录，还要校验输入和限制工具的访问范围。" },
  { chapter: 2, title: "工具的名字之外，模型还需要什么？", goal: "理解工具说明、参数类型和默认值的用途。",
    excerpt: "课程通过普通 Python 函数展示工具定义：参数及类型标注描述要传什么，docstring 解释函数的作用，默认值说明可以省略什么。\n\n只给一个叫 lookup 的名字，很难判断它查的是天气、价格还是咖啡记录。清楚的说明如“按咖啡豆名称读取本人最近三次冲煮记录”，能帮助模型选择工具。类型与说明提升可用性，但应用仍需验证参数，不能把模型输出直接当可信输入。",
    practice: "给“查菜价”工具写一句说明，至少说清城市、单位和数据来源中的两项。",
    answer: "例如：按杭州城市口径读取指定食材的历史零售价格，结果注明元/斤及记录时间；样本不足时如实返回不足。" },
  { chapter: 2, title: "示例里的天气，为什么不是真天气？", goal: "区分演示工具、真实证据与看似可信的回答。",
    excerpt: "第 2 章最小天气工具返回固定的晴天句子。它演示模型如何请求和使用工具，不是实时天气服务。即使模型顺利调用它，也只能证明调用链路能工作。\n\n同样，学习任务能勾选，只证明进度记录可用；把 README 切成片段，也不代表 AI 读懂课程。评价助手时应分别问：接口通了吗？数据真实吗？输出是否真的帮助完成目标？",
    practice: "如果价格工具永远返回“8 元/斤”，这能证明买菜建议可靠了吗？为什么？",
    answer: "不能。它最多测试工具交互。可靠的价格判断还需真实来源、时间、规格、单位及可比口径。" },
  { chapter: 2, title: "任务规划不是每轮都要执行的固定流程", goal: "避免把一张 Agent 流程图理解为强制步骤。",
    excerpt: "课程提醒：在其当前版本说明中，要使用显式 Todo，需要按需配置 TodoListMiddleware。启用了规划能力，也不代表每次都必须先写计划、搜索、委派再总结。\n\n“解释一个名词”和“研究多个来源并交付报告”所需步骤不同。工具和中间件提供能力，模型与流程根据当前任务选择；具体版本行为要以正在使用的依赖和正文提醒核对。",
    practice: "给“解释什么是库存”和“根据库存规划三顿饭”分别判断是否值得先列多步计划。",
    answer: "前者通常直接解释即可；后者可能需要查库存、了解人数与时间、组合食材并检查约束，更适合多步规划。" },
];

export function reviewedDeepAgentsPlan(): LearningPlan {
  const tasks = lessons.map((lesson) => ({
    id: `reviewed-deepagents-${lessons.indexOf(lesson) + 1}`, title: lesson.title, goal: lesson.goal,
    excerpt: lesson.excerpt, practice: lesson.practice, answer: lesson.answer, sourceLine: 1,
    sourcePath: lesson.chapter === 1 ? "content/ch01-agent-harness.md" : "content/ch02-quickstart.md",
    sourceUrl: `https://github.com/datawhalechina/deepagents-in-action/blob/main/content/${lesson.chapter === 1 ? "ch01-agent-harness.md" : "ch02-quickstart.md"}`,
    completed: false, revisit: false, note: "",
  }));
  return planSchema.parse({ id: crypto.randomUUID(), title: "Deep Agents 实战 · 前两章入门", sourceUrl: "https://github.com/datawhalechina/deepagents-in-action", importedAt: new Date().toISOString(), tasks, activeTaskId: tasks[0].id,
    method: "reviewed", coverage: "根据第 1、2 章整理的 8 个手机阅读任务，包含教学类比，非整套课程总结，亦非模型实时生成。原课程：Datawhale《Deep Agents 实战》，文字许可 CC BY-NC-SA 4.0；本组改编亦依相同许可。" });
}
