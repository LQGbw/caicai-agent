import { planSchema, type LearningLibrary, type LearningPlan } from "./plan";

// Teaching notes rewritten from the linked chapters; checked 2026-10-25.
// Original: Datawhale / 沧海九粟, CC BY-NC-SA 4.0 (text). Adapted notes use the same license.
export const reviewedCourseRevision = 2;
const sourceUrl = "https://github.com/datawhalechina/deepagents-in-action";
const lessons = [
  {
    chapter: 1, title: "先认识 Agent：一次 invoke，为什么不只问一次模型？",
    goal: "沿着天气示例，说清模型、工具和执行循环分别做了什么。",
    excerpt: `先带着一个问题阅读：你只问了一次天气，助手为什么可能请求两次模型？第 1 章介绍框架的分层，第 2 章给出天气助手。先把这个最小例子想明白，后面的文件、规划和子任务才有共同基础。

普通聊天中，应用把问题交给模型，拿到文本后展示。支持工具的助手还有另一条分支：模型不急着写答案，而是返回“请调用这个函数，以及这些参数”。执行函数的是应用或框架，不是模型在脑中运行 Python。函数结果作为消息交回模型，它再判断信息是否足够。

把下面的伪代码当成运行地图，而不是直接可执行的程序。model(context) 可能得到工具请求，也可能直接得到最终回答。execute_checked 表示按注册关系执行工具，实际业务还需校验参数和权限。结果放回上下文，下一次模型请求才能读到；缺少这一步，模型即使选对工具，也没有获得数据。

套到课程的天气例子：用户问北京天气 → 模型可能请求 get_weather，参数是北京 → Python 函数返回演示天气 → 模型读到结果后组织回答。外层的 agent.invoke(...) 包住整个过程，所以一次调用不等于一次模型请求。这是一种可能路径，不承诺每次都选同样的工具。

还要区分两个边界。有工具可用不等于每次必须调用：解释 Agent 这个词，通常不需要天气工具。循环也不保证顺利完成：接口报错、达到运行限制或等待审批，都可能让执行停止或暂停。流畅的最终回答，本身不足以证明助手正确获取了信息。`,
    code: `# 执行过程伪代码，不是 Deep Agents API
reply = model(context)
while reply.requests_tools:
    results = execute_checked(reply.tool_calls)
    context = context + [reply] + results
    reply = model(context)
return reply.final_text`,
    codeExplanation: "reply 是本次模型响应；context 是下一次请求携带的消息。while 表示工具结果返回后继续判断，不是固定流水线。execute_checked 是讲解占位符，不是可导入的函数。",
    practice: "补齐链路：用户问天气 → ①谁决定调用哪个工具？→ ②谁执行 Python 函数？→ ③函数结果交给谁？然后解释：为什么一次 invoke 可能请求两次模型？如果问题是“什么是 Agent”，还必须查天气吗？",
    answer: "①模型提出调用及参数；②框架或应用执行已注册函数；③结果放回上下文交给模型。第一次模型响应可以是工具请求，第二次读到工具结果再回答。“什么是 Agent”不依赖天气，因此有工具不代表必须用。",
  },
  {
    chapter: 1, title: "沿一次研究任务，分清 LangGraph、LangChain 和 Deep Agents",
    goal: "按职责理解 Runtime、Framework、Harness，而不是把三个库当替代品。",
    excerpt: `假设任务是“查找资料，写一份有来源的报告”。你要向模型发消息，也要搜索、读取资料；若中途等人工确认，还需要知道从哪里继续。这些问题不在同一个层次，第 1 章用三层结构解释它们。

最下面的 Runtime 是执行基础设施。课程里的代表是 LangGraph：步骤如何运行、当前是什么状态、在哪里暂停和恢复，都在它关注的范围。支持恢复是框架能力；应用仍要配置持久化、线程标识等条件，不能只安装库就宣称断电后不丢数据。

中间的 Framework 提供搭建 Agent 的标准接口。LangChain 把模型、工具、消息和中间件连接起来，让开发者不必为每个模型重写循环。搜索函数仍可能由你实现：注册 internet_search 不等于框架自动替你购买搜索服务、申请 Key 或判定资料可信。

最上面的 Harness 装配复杂任务常用能力。Deep Agents 在这套栈中提供文件操作、上下文管理、子任务委派等配套，并允许按需配置规划策略。它不是一个更大的模型；同样的模型，接了不同工具与运行规则，实际能力也会不同。

下面箭头表示依赖与装配，不是每个问题都依次调用三个网络服务。从 create_deep_agent 进入高层接口时，底下仍使用 LangChain 的循环与 LangGraph 的执行。因此“用了 Deep Agents，就没用 LangChain”是误解。

回到研究任务：搜索网站的函数是业务工具；模型根据结果继续选择动作属于循环；暂停后恢复需要执行与状态支持；装配现成文件工具是 Harness 的价值。一项能力可以跨层协作，不必把所有组件强行放进互斥的盒子。`,
    code: `应用：研究问题 + 搜索工具 + 输出要求
  ↓ 配置
Deep Agents：装配工具与中间件能力（Harness）
  ↓ 使用
LangChain：模型—工具循环（Framework）
  ↓ 运行于
LangGraph：执行、状态、暂停与恢复（Runtime）`,
    codeExplanation: "这是职责关系图，不是代码。课程当前说明部分能力需按需启用，不能把“支持”理解为“全部默认开启”。默认值应结合实际版本核对。",
    practice: "给研究助手分配职责：A. 调搜索服务的 Python 函数；B. 读结果后决定继续查还是写报告；C. 等人审批后恢复；D. 装配文件读写。分别说明主要由哪层或业务代码负责，再解释三层为什么不是三选一。",
    answer: "A 是业务工具；B 由模型决策与框架循环协作完成；C 需要运行时及应用正确的保存、恢复配置；D 是 Harness 装配能力。高层接口使用下层能力，选择高层并不等于丢掉下层。",
  },
  {
    chapter: 1, title: "上下文工程：研究助手怎样只读当前需要的资料？",
    goal: "区分当前模型输入、按需读取的文件，以及文件真正存放的位置。",
    excerpt: `上一课说明谁装配能力。这一课讨论为什么需要文件工具。模型每次请求的输入容量有限，把几十个网页和整个项目都塞进去，不仅成本高，还可能让当前问题埋在无关内容里。第 1 章把“此刻给模型什么，以及以后怎样取回信息”作为上下文工程的重要问题。

研究助手拿到两篇长材料，现在只要比较一个术语的定义。它可先查目录或搜索关键词，定位文件，再读取有关段落。模型根据返回的信息决定是否补读，而不是要求开发者预先把所有材料一次打包进去。

下面是讲解用的工具轨迹，不是可复制的调用代码。先定位、再读相关内容、把中间整理保存到文件，之后需要时回查。参数名称、分页单位和权限应查实际版本的工具定义；这一课要掌握的是信息流，不是背命令。

写进文件不等于以后模型自动知道文件内容。下一次请求仍需要路径、索引或检索线索，并通过工具读取。把长文压成摘要也可能丢细节，所以保留可回查的原材料和来源，与保存摘要同样重要。

模型看到文件读写动作，Backend 决定动作背后操作的是临时数据、本机文件还是持久化存储。看到一个路径不能证明它已落到服务器磁盘，更不能保证换条对话后仍存在。持久性需要正确配置并测试。

你可以用三个问题检查设计：当前判断必须读什么？读过的长结果放在哪里？后面核对细节怎样找回来？如果只回答“全放进提示词”，往往只是把信息管理问题推给模型，并没有真正解决。`,
    code: `# 工具轨迹示意，不是直接可运行的调用
ls → 发现资料目录
read_file → 读取与术语相关的段落
write_file → 保存带来源的中间整理
read_file → 需要时回查原材料`,
    codeExplanation: "Tool 提供动作，Backend 实现实际读写；二者都不是 Agent 循环本身。这里是可能路径，不规定每次任务必须先列目录再写文件。",
    practice: "你只比较两篇长文中的一个术语：最少需要读取什么？把全文移出上下文后，应保留哪两种回查线索？如果文件在临时 Backend 中，能否据此承诺明天还可读？说明理由。",
    answer: "先定位两篇中的定义及必要上下文，不必先读整库。保留路径或来源，以及段落位置、检索关键词等线索。临时 Backend 不保证跨会话保存，需要核对存储实现和生命周期。",
  },
  {
    chapter: 1, title: "报告做到一半，和下次仍要记住的事，有什么不同？",
    goal: "分清线程状态与跨线程信息，并知道它们都需要配置保存。",
    excerpt: `报告写到一半关闭页面，你希望下次继续；下周研究另一个主题，你又希望助手知道你偏好中文输出。两种“记住”看起来相似，第 1 章的架构说明却把它们放在不同位置。

线程状态描述某一执行线发生了什么：本次问题、工具结果、是否等审批。Checkpointer 把这类状态保存成可恢复的检查点。应用还要配置保存实现、使用正确线程标识；创建新线程，不应误以为自动接着旧任务运行。

跨线程数据描述别的任务也可能需要的信息，例如你明确确认的输出语言偏好。Store 或持久化 Backend 可以参与保存。并不是把所有消息存起来，就自动得到可靠的个人记忆：记录什么、归属于谁、何时过期、怎样取回，都需要设计。

课程还提到 memory 参数：它指定启动时加载哪些记忆文件。文件是否跨线程仍存在，要看实际 Backend。加载文件、保存执行检查点、保存跨线程数据，不是同一个开关。下面只是职责对照，不是完成记忆系统的配置教程；具体实现要继续读后续章节。

举个研究任务中的边界：用户说“这次先不用搜索”，是本次约束，不该未经确认变成永久禁用搜索。模型猜测“用户偏好短回答”，也不等于用户确认。记录可以保留猜测身份，但不能存完就升级成事实。

测试时分别问：同一任务中断后能否从正确位置继续？新任务能否读取明确确认的偏好？只看到聊天记录仍在，不足以同时证明执行恢复和长期记忆都有效。`,
    code: `同一线程继续执行 → 检查点 + 线程标识 + 恢复配置
不同任务复用信息 → 跨线程存储 + 归属 + 读取逻辑
启动时加载记忆文件 → memory 配置 + 文件 Backend

# 职责对照，不是可执行配置`,
    codeExplanation: "这些机制互相配合，但职责不同。本课只读第 1 章的架构边界，不声称已经实现第 8 章的记忆系统。",
    practice: "分类并解释：①报告正等审批；②用户确认以后优先中文输出；③模型猜测用户不喜欢长文；④这次无需搜索。哪些是本次状态或约束，哪些可作长期记录，哪些必须标注未确认？",
    answer: "①是执行状态；②是明确确认的跨任务偏好；③是未确认推测，不能当事实；④是本次约束，不能推广到以后。真正保存与恢复仍要配置并测试，术语本身不会带来持久化。",
  },
  {
    chapter: 2, title: "逐段读最小天气助手：配置、注册与 invoke",
    goal: "解释最小程序各段作用，区分创建助手和开始执行。",
    excerpt: `第 2 章先准备环境和模型连接，再创建天气助手。本课只在手机上读代码，不要求此刻安装依赖，也不把安装、申请 Key 与完整运行包装成几分钟就能完成的事。方便时再到电脑上核对课程的 Python 版本和依赖要求。

程序可分四段：准备模型连接、定义工具、创建 Agent、调用 Agent。这里 model 应是预先配置好的、支持工具调用的模型对象。Key 用于认证，base_url 决定请求发往哪家服务，model ID 选择这家实际提供的模型。三者要匹配；兼容某种接口格式，不意味着所有模型名都可用。

下面是教学改写片段，不是独立脚本。函数提供可被请求的动作；tools=[get_weather] 把函数注册给助手；system_prompt 写目标和边界；create_deep_agent 装配并返回可调用的 Agent。执行创建步骤，不等于已经查询天气。

invoke 提交真正的问题。messages 中 role 标记消息来自用户，content 是用户文字，框架据此启动循环。result 保存返回消息，[-1] 取列表最后一项，content 取其内容，用来展示最终回复。调试全部消息和展示最后文本不是同一用途。

特别看函数体：不论输入哪个城市，都拼出固定的晴天句子。工具叫 get_weather，不会自动获得实时数据。调用成功最多证明链路工作；真实查询还需接可靠天气源，明确地点、时间等条件。

把提示词改成“使用实时天气”，不会让固定字符串变成真数据。阅读其他 Agent 项目时，也应沿这四段追踪真正的数据入口，而不是只看最后一句自然语言像不像答案。`,
    code: `from deepagents import create_deep_agent

def get_weather(city: str) -> str:
    """返回指定城市的演示天气，不是实时查询。"""
    return f"演示数据：{city}为晴天"

# model 已预先配置；此片段不是独立脚本
agent = create_deep_agent(
    model=model,
    tools=[get_weather],
    system_prompt="回答天气问题，并说明数据局限。",
)
result = agent.invoke({
    "messages": [{"role": "user", "content": "北京天气如何？"}]
})
print(result["messages"][-1].content)`,
    codeExplanation: "def 定义函数；city: str 标记输入类型；-> str 标记输出类型；三引号是工具说明。tools 注册函数，不是在此处执行函数。invoke 才提交问题。model 必须预先配置，代码中没有可用密钥。",
    practice: "指出哪行注册工具、哪行开始执行、哪行读取最终回答。把问题换成上海，函数返回如何变化？为什么这仍不能证明它知道上海当前的天气？只改 system_prompt 能修好真实数据缺失吗？",
    answer: 'tools=[get_weather] 注册，agent.invoke(...) 开始执行，print(result["messages"][-1].content) 展示最后消息。若调用工具，city 改成上海，但仍固定晴天。没有联网查询，改提示词也无法凭空补上数据源。',
  },
  {
    chapter: 2, title: "把函数做成工具：类型、说明、默认值与校验",
    goal: "读懂工具签名，区分接口可理解与执行安全。",
    excerpt: `模型怎样知道一个 Python 函数何时该用、参数如何填？第 2 章的搜索与计算示例展示了名称、参数类型、默认值和 docstring 的用途。框架用这些形成工具描述，而不是要求模型仅凭名字猜实现。

下面把搜索接口缩成阅读片段。query 是搜索词，str 表示文本；max_results 用 int 表示数量，默认 5；-> dict 标记返回字典。三引号里的说明描述用途。这里故意省略真实实现，不连接搜索服务，不能把省略号当成可用搜索。

用户要“找三条 LangGraph 资料”时，合理参数可为 query 填主题，max_results 填 3；只说“找些资料”时可采用默认值。默认值让省略参数有确定行为，不是要求模型永远不能传该参数。

试把函数改名为 do_it 并删除说明。Python 可能仍能执行，但模型选择动作的线索减少了。反过来，清楚的说明也不会修复网络故障或错误结果。说明让接口可理解，实现负责动作，调用处还需处理超时、异常与权限。

类型标注不是权限或额度校验。max_results: int 不会替你把数量限制在合理范围。真实工具需校验参数、控制费用并处理失败。课程的计算示例使用 eval 且注明仅供演示；产品不能直接执行模型给出的任意表达式，要用受限解析或明确允许的运算。

设计完工具，要分别检查：模型知道何时用吗？输入校验了吗？动作真实完成了吗？返回结果足以支持答案吗？只通过第一项，不代表整体安全可靠。`,
    code: `def internet_search(
    query: str,
    max_results: int = 5,
) -> dict:
    """按搜索词检索网页，返回最多 max_results 条结果。"""
    ...  # 接口示意：省略真实实现，不能直接使用`,
    codeExplanation: "query 没默认值，是必填；max_results 有默认值，可省略。-> dict 不是校验器。执行省略号不会返回真实字典，必须补上服务接入与返回处理后才能用作搜索工具。",
    practice: "写出“只找三条 LangGraph 资料”的参数。再判断：max_results 传 100 万，只标 int 能阻止吗？模型给一个字符串，直接用 eval 计算为什么有风险？分别提出一项应用侧限制。",
    answer: "可传 query='LangGraph'、max_results=3。int 不限制范围，应加数量上限、额度与超时。eval 可能执行非预期表达式甚至代码，应改受限解析器或白名单运算并校验输入。",
  },
  {
    chapter: 2, title: "研究助手怎样工作：规划不是每次必走的流程",
    goal: "推演搜索与模型的交互，区分启用规划和实际使用规划。",
    excerpt: `天气例子之后，第 2 章构建研究助手：注册搜索函数、配置研究目标，再提交问题。复杂之处不只是把步骤写进提示词，而是每次拿到结果后，要判断证据够不够，是否继续行动。

在脑中运行一次“解释 LangGraph 并给来源”：模型提出检索；搜索服务返回摘要；模型发现关键说法只有二手出处，再查官方资料；证据够用后作答。这是教学推演，不是一次真实日志。它说明工具结果为何要回到模型，也说明相同输入不保证固定搜索次数。

课程研究示例显式配置了 TodoListMiddleware。当前 v0.7 说明强调显式计划按需启用，不是所有 Agent 默认写 Todo。即使提供规划工具，模型也可能判断小问题无需列计划。装配能力和实际使用，是不同动作。

下面保留配置位置，前提是 model 和 internet_search 已定义。middleware 接收中间件实例，可扩展工具、状态或介入执行；system_prompt 表达目标与证据要求，不是假装已取得事实。是否继续搜索，要根据当前结果判断。

若搜索返回空结果，可靠回应应承认证据不足，或在允许范围内改查询；不能为“完成任务”编造来源。若服务报错，多写一句“必须能搜索”也修不好接口。调试要看实际调用、参数、结果与结束原因，而不只是报告排版。

长任务可能再用文件或子任务，但入门不需要每次演示所有能力。先确认一个真实搜索工具能通，模型引用正确，再增加复杂路径，才能知道新增能力究竟帮了什么。`,
    code: `from langchain.agents.middleware import TodoListMiddleware

# model 和 internet_search 必须预先配置
agent = create_deep_agent(
    model=model,
    tools=[internet_search],
    system_prompt="根据搜索证据回答，信息不足时明确说明。",
    middleware=[TodoListMiddleware()],
)`,
    codeExplanation: "这里显式加入规划能力，不是命令模型每次都列计划。搜索函数必须有真实实现，不能直接用上一课的省略号。具体默认行为核对原文当前的 v0.7 提醒。",
    practice: "比较“一句话解释 Agent”和“对比三个框架并引用官方来源”：是否值得先规划？搜索连续返回空结果，你应检查哪些信息，最终回答不该声称什么？规划中间件出现在配置里，能证明这次用过计划工具吗？",
    answer: "第一问通常直接回答；第二问适合先明确比较维度、取证再综合，但不是固定协议。空结果时检查查询、服务配置、参数与实际响应；不伪造来源或宣称已全面检索。是否用过规划需看真实轨迹，不能只看配置。",
  },
  {
    chapter: 2, title: "独立检查演示：接通、真实、可恢复，分别怎么验证？",
    goal: "用前两章概念审查一个助手，不仅凭最终输出判断可靠性。",
    excerpt: `这课不再增加一串名词，而是用已有概念检查一次演示。有人说：“天气助手运行成功，所以它有实时天气、长期记忆和完整规划。”你现在应能指出，这远超过一句成功回答能证明的范围。

先看连接层。地址、Key 与模型 ID 要配对，并通过真实请求验证。普通聊天可用，不自动证明工具调用也可用；天气工具可用，也不证明图片和语音接口能用。“找不到模型”要核对服务商实际列表，不能假定一个 Key 能使用所有名称。

再看数据层。下面函数有名称、类型和返回字典，但天气完全写死。它能测试工具请求和结果回传，不能支持任何当前天气断言。正确做法是明确标注演示，或接入可靠数据源；删掉“演示”两字不会让数据变真。

然后看状态层。消息保存在返回变量里，不等于下次进程仍在，更不是跨线程记忆。承诺恢复任务，应测中断后同线程继续；承诺记住偏好，应测新任务读取确认的信息。存储、生命周期和读取规则都要有证据，框架名称不能代替测试。

最后看行为层。配置中间件只证明装配了能力；这次是否规划，要看工具轨迹。学习任务勾选也只是用户报告完成，不是理解证明。所以现在请先做推演，再看参考答案：能独立指出错误，比把所有进度框勾上更接近掌握。

前两章可以收束为：模型提出动作或回答，工具处理真实数据，框架组织循环，存储和上下文设计决定能否继续。后面学习文件系统、记忆和规划时，把新能力放回这张关系图，不必把每章当成互不相关的名词表。`,
    code: `def get_weather(city: str) -> dict:
    """仅用于测试工具链路的天气数据。"""
    return {"city": city, "weather": "晴", "source": "固定演示值"}

# 教学改写：不访问网络，不保存跨线程记录`,
    codeExplanation: "函数可以运行，但只返回常量与输入城市。dict、函数名和注释不会增加联网能力，也没有保存或恢复配置。能执行与真实可靠是两回事。",
    practice: "先在笔记写四行结论：①成功运行实际验证哪条链路？②哪项天气断言没依据？③证明长期记忆还缺什么测试？④证明本次做了规划应看什么？写完再展开参考，检查自己是否把“支持”当成了“已发生”。",
    answer: "①模型请求工具、框架执行并回传结果等链路；②固定文本不能证明城市当前真晴天；③需配置持久化并在新任务验证读取确认信息，执行恢复另测同线程；④检查实际计划工具调用及状态，不能只看创建时配置。",
  },
];

export function reviewedDeepAgentsPlan(): LearningPlan {
  const tasks = lessons.map((lesson, index) => ({
    id: `reviewed-deepagents-${index + 1}`, title: lesson.title, goal: lesson.goal,
    excerpt: lesson.excerpt, code: lesson.code, codeExplanation: lesson.codeExplanation,
    practice: lesson.practice, answer: lesson.answer, sourceLine: 1,
    sourcePath: lesson.chapter === 1 ? "content/ch01-agent-harness.md" : "content/ch02-quickstart.md",
    sourceUrl: `${sourceUrl}/blob/main/content/${lesson.chapter === 1 ? "ch01-agent-harness.md" : "ch02-quickstart.md"}`,
    completed: false, revisit: false, note: "",
  }));
  return planSchema.parse({ id: crypto.randomUUID(), title: "Deep Agents 实战 · 前两章入门", sourceUrl,
    importedAt: new Date().toISOString(), tasks, activeTaskId: tasks[0].id, method: "reviewed", contentRevision: reviewedCourseRevision,
    coverage: "依据第 1、2 章改编的 8 课：解释、代码推演、练习与参考。代码示意与原文示例分开说明，非整套课程，非模型实时生成。原课程：Datawhale / 沧海九粟；原文与本组改编文字均为 CC BY-NC-SA 4.0。2026-10-25 核对。" });
}

// Only the shipped starter is eligible. Arbitrary AI/user imports are never overwritten.
export function isOutdatedReviewedPlan(plan: LearningPlan): boolean {
  return plan.method === "reviewed" && plan.sourceUrl === sourceUrl
    && (plan.contentRevision ?? 1) < reviewedCourseRevision && plan.tasks.length === 8
    && plan.tasks.every((task, index) => task.id === `reviewed-deepagents-${index + 1}`);
}

export function upgradeReviewedLibrary(library: LearningLibrary, fresh: LearningPlan): LearningLibrary {
  if (fresh.method !== "reviewed" || fresh.sourceUrl !== sourceUrl || fresh.contentRevision !== reviewedCourseRevision
    || fresh.tasks.length !== 8 || !fresh.tasks.every((task, index) => task.id === `reviewed-deepagents-${index + 1}`)) {
    throw new Error("课程更新格式不符，原进度未更改。");
  }
  return { ...library, plans: library.plans.map((old) => {
    if (!isOutdatedReviewedPlan(old)) return old;
    return { ...fresh, id: old.id, importedAt: old.importedAt, activeTaskId: old.activeTaskId,
      tasks: fresh.tasks.map((task) => {
        const previous = old.tasks.find((entry) => entry.id === task.id)!;
        return { ...task, completed: previous.completed, revisit: previous.revisit, note: previous.note };
      }) };
  }) };
}
