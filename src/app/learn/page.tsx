"use client";

import { useEffect, useState } from "react";
import {
  createLearningPlan, emptyLibrary, librarySchema, planSchema, sampleMaterial, storageKey,
  type LearningLibrary, type LearningTask, type LearningPlan,
} from "@/lib/learning/plan";
import "./learning.css";

export default function LearningPage() {
  const [library, setLibrary] = useState<LearningLibrary>(emptyLibrary);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"github" | "paste">("github");
  const [repository, setRepository] = useState("");
  const [title, setTitle] = useState("");
  const [material, setMaterial] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [storageError, setStorageError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "revisit">("all");
  const [chapters, setChapters] = useState<{ path: string; title: string }[]>([]);
  const [chapter, setChapter] = useState("");
  const [goal, setGoal] = useState("我是新手，先理解 Agent 的原理，用手机每天学一点，之后能用于自己的生活助手项目。");

  /* Browser storage is unavailable during SSR. This one-time hydration deliberately
     restores validated external state after mount; it does not derive state from props. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setLibrary(librarySchema.parse(JSON.parse(raw)));
    } catch { setStorageError("已有进度无法读取，暂未覆盖。请先导出备份，或换一个浏览器使用。"); }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function commit(next: LearningLibrary) {
    setLibrary(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageError(""); }
    catch { setStorageError("当前浏览器无法保存进度，请导出备份；关闭页面后可能丢失本次变化。"); }
  }

  const plan = library.plans.find((item) => item.id === library.activePlanId) ?? library.plans[0];
  const active = plan?.tasks.find((task) => task.id === plan.activeTaskId) ?? plan?.tasks[0];
  const completed = plan?.tasks.filter((task) => task.completed).length ?? 0;

  function addPlan(text: string, name: string, url: string | null = null) {
    acceptPlan(createLearningPlan(text, name, url));
  }

  function acceptPlan(value: LearningPlan) {
    if (library.plans.length >= 10) throw new Error("当前浏览器最多保存 10 份资料，请先导出备份。");
    const next = planSchema.parse(value);
    commit({ ...library, plans: [...library.plans, next], activePlanId: next.id });
    setShowImport(false); setNotice("学习任务已保存，可以随时停下，下次从当前任务继续。");
  }

  async function startReviewed() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/learning/starter");
      if (!response.ok) throw new Error("入门任务读取失败，请稍后重试。");
      acceptPlan(await response.json());
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }

  async function readChapters() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/learning/source?repository=${encodeURIComponent(repository)}`);
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setChapters(data.chapters); setNotice(data.coverage);
    } catch (error) { setNotice((error as Error).message); }
    finally { setBusy(false); }
  }

  async function importMaterial(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
        const response = await fetch("/api/learning/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tab === "github"
          ? { repository, ...(chapter ? { chapter } : {}), goal } : { material, title, goal }) });
        if (response.status === 401) throw new Error("AI 生成需要你的网站登录。请先打开设置页登录并保存 API；入门任务无需登录。");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "资料读取失败。");
        acceptPlan(data);
    } catch (error) { setNotice(error instanceof Error ? error.message : "导入失败，请重试。"); }
    finally { setBusy(false); }
  }

  function updateTask(id: string, update: Partial<LearningTask>) {
    if (!plan) return;
    commit({ ...library, plans: library.plans.map((item) => item.id === plan.id
      ? { ...item, tasks: item.tasks.map((task) => task.id === id ? { ...task, ...update } : task) } : item) });
  }

  function selectTask(id: string) {
    if (!plan) return;
    commit({ ...library, plans: library.plans.map((item) => item.id === plan.id ? { ...item, activeTaskId: id } : item) });
  }

  function nextTask() {
    if (!plan || !active) return;
    const index = plan.tasks.findIndex((task) => task.id === active.id);
    const next = plan.tasks.slice(index + 1).find((task) => !task.completed)
      ?? plan.tasks.find((task) => !task.completed && task.id !== active.id);
    if (next) selectTask(next.id);
    else setNotice("这一份资料已没有其他待学任务，可以回看标记为待复习的内容。");
  }

  function exportProgress() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(library, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "learning-progress.json";
    anchor.click(); URL.revokeObjectURL(url);
  }

  async function restoreProgress(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2500000) throw new Error("备份文件过大。");
      const restored = librarySchema.parse(JSON.parse(await file.text()));
      const merged = new Map(library.plans.map((item) => [item.id, item]));
      // Existing local records win; importing a backup never silently rewinds local progress.
      for (const item of restored.plans) if (!merged.has(item.id)) merged.set(item.id, item);
      if (merged.size > 10) throw new Error("合并后超过 10 份资料。");
      commit({ version: 1, plans: [...merged.values()], activePlanId: library.activePlanId ?? restored.activePlanId });
      setNotice("已合并备份，现有同名任务进度未覆盖。");
    } catch { setNotice("备份格式无效或超过容量，原进度未更改。"); }
  }

  return <main className="learning-page">
    <div className="learning-heading"><div><p className="learning-eyebrow">随时学一点 · 学习活动 Demo</p><h1>有五分钟，就学一小步。</h1>
      <p>带上你的资料，读一段、想一想，随时回来接着学。</p></div>
      {plan && <button className="learning-secondary" onClick={() => setShowImport(!showImport)}>＋ 导入资料</button>}</div>
    {!ready ? <p role="status">正在恢复学习进度…</p> : <>
      {storageError && <p className="learning-alert" role="alert">{storageError}</p>}
      {(!plan || showImport) && <section className="learning-import">
        <h2>Deep Agents：先从真正的第一课开始</h2>
        <p>已按第 1、2 章整理 8 个入门任务，先讲概念，再看例子和做小练习。不需要配置 API 即可阅读。</p>
        <button className="learning-primary" disabled={busy} onClick={startReviewed}>开始 Deep Agents 入门 →</button>
        <p className="learning-footnote">这是核对原文后整理的课程，不是模型实时生成。AI 按个人目标编排可使用下方导入。</p>
      </section>}
      {(!plan || showImport) && <section className="learning-import">
        <h2>从一份资料开始</h2>
        <div className="learning-tabs"><button aria-pressed={tab === "github"} onClick={() => setTab("github")}>GitHub 项目</button><button aria-pressed={tab === "paste"} onClick={() => setTab("paste")}>粘贴资料</button></div>
        <form onSubmit={importMaterial}>
          {tab === "github" ? <><label>公开仓库首页<input type="url" required value={repository} onChange={(event) => { setRepository(event.target.value); setChapters([]); setChapter(""); }} placeholder="https://github.com/用户名/项目名" /><small>优先读取 content/docs 中的实际章节；默认先学前两篇，不把目录当教材。</small></label>
            <button type="button" className="learning-secondary" onClick={readChapters} disabled={busy || !repository}>读取课程目录 / 选择章节</button>
            {!!chapters.length && <label>本次学习范围<select value={chapter} onChange={(event) => setChapter(event.target.value)}><option value="">先读前两篇正文</option>{chapters.map((item) => <option key={item.path} value={item.path}>{item.title}</option>)}</select></label>}</>
            : <><label>资料名称<input value={title} maxLength={180} onChange={(event) => setTitle(event.target.value)} placeholder="例如：Agent 入门笔记" /></label>
              <label>学习正文<textarea required minLength={40} maxLength={60000} rows={8} value={material} onChange={(event) => setMaterial(event.target.value)} placeholder="粘贴 Markdown 或文字，保留章节标题会拆分得更清楚。" /></label></>}
          <label>这次想学会什么？<textarea rows={2} maxLength={500} value={goal} onChange={(event) => setGoal(event.target.value)} /></label>
          <div className="learning-import-actions"><button className="learning-primary" disabled={busy}>{busy ? "正在读取正文并整理，请稍候…" : "AI 生成学习任务"}</button>
            <button type="button" className="learning-secondary" disabled={busy} onClick={() => { try { addPlan(sampleMaterial, "示例：理解带工具的助手"); } catch (error) { setNotice((error as Error).message); } }}>先试一份示例</button></div>
        </form>
        <p className="learning-footnote">AI 生成会把本次章节或粘贴内容发送到你在<a href="/settings">设置页</a>保存的模型服务，需要先保存并测试 API。不会读取整个仓库，生成后注明实际范围。</p>
      </section>}
      {notice && <p className="learning-notice" role="status">{notice}</p>}
      {plan && active && <>
        {!plan.method && <div className="learning-alert"><p>这是旧版 README 切片任务，未经过内容理解。原有进度仍保留。</p><button className="learning-secondary" disabled={busy} onClick={startReviewed}>另建经过整理的 Deep Agents 入门任务</button></div>}
        {plan.coverage && <p className="learning-footnote">{plan.method === "ai" ? "AI 整理 · " : "课程整理 · "}{plan.coverage}</p>}
        <section className="learning-overview">
          <label>我的资料<select aria-label="切换学习资料" value={plan.id} onChange={(event) => { commit({ ...library, activePlanId: event.target.value }); setNotice(""); }}>
            {library.plans.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <div><strong>{completed}<small> / {plan.tasks.length} 项已勾选</small></strong><progress value={completed} max={plan.tasks.length} aria-label="本份资料完成进度" /></div>
        </section>
        <div className="learning-workspace">
          <section className="learning-current" aria-label="当前学习任务">
            <div className="learning-task-meta"><span>当前小任务</span><span>阅读 + 回想 · 约 5 分钟</span></div>
            <h2>{active.title}</h2>
            {active.goal && <p className="learning-goal">这一小步学会：{active.goal}</p>}
            <p className="learning-source">{active.sourcePath || `原文第 ${active.sourceLine} 行起`}{(active.sourceUrl || plan.sourceUrl) && <> · <a href={active.sourceUrl || plan.sourceUrl!} target="_blank" rel="noopener noreferrer">{active.sourcePath ? "核对章节原文 ↗" : "查看原始资料 ↗"}</a></>}</p>
            <details open key={active.id}><summary>{plan.method ? "先弄懂这个概念" : "旧版原文片段"}</summary><div className="learning-excerpt">{active.excerpt}</div></details>
            <div className="learning-practice"><h3>再花一分钟，想一想</h3><p>{active.practice}</p></div>
            {active.answer && <details className="learning-answer" key={`answer-${active.id}`}><summary>想好后，查看参考思路</summary><p>{active.answer}</p></details>}
            <label className="learning-note">我的理解 / 下次想问的问题<textarea rows={3} maxLength={2000} value={active.note} onChange={(event) => updateTask(active.id, { note: event.target.value })} placeholder="可以写一句，也可以先留空。笔记自动保存。" /></label>
            <div className="learning-checks"><label><input type="checkbox" checked={active.completed} onChange={(event) => updateTask(active.id, { completed: event.target.checked })} />这次已学过</label><label><input type="checkbox" checked={active.revisit} onChange={(event) => updateTask(active.id, { revisit: event.target.checked })} />还想再看</label></div>
            <button className="learning-primary" onClick={nextTask}>继续下一小步 →</button>
            <p className="learning-footnote">离开即可暂停，下次会恢复到这里。勾选表示你记录的学习进度，不代表技能认证。</p>
          </section>
          <aside className="learning-task-list"><h2>随时回来接着学</h2>
            <div className="learning-filters">{([["all", "全部"], ["pending", "待学习"], ["revisit", "想再看"]] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
            <ol>{plan.tasks.filter((task) => filter === "all" || (filter === "pending" ? !task.completed : task.revisit)).map((task) => <li key={task.id} className={task.id === active.id ? "is-active" : ""}>
              <input type="checkbox" aria-label={`标记已学过：${task.title}`} checked={task.completed} onChange={(event) => updateTask(task.id, { completed: event.target.checked })} />
              <button onClick={() => selectTask(task.id)} aria-current={task.id === active.id ? "step" : undefined}>{task.title}<small>{task.revisit ? "想再看 · " : ""}约 5 分钟</small></button>
            </li>)}</ol>
            {!plan.tasks.some((task) => filter === "all" || (filter === "pending" ? !task.completed : task.revisit)) && <p>这里暂时没有任务。</p>}
          </aside>
        </div>
      </>}
      <footer className="learning-footer"><p>进度只保存在当前浏览器。换手机前先导出备份，再在新设备导入。</p>
        <div><button className="learning-secondary" disabled={!library.plans.length} onClick={exportProgress}>导出进度</button><label className="learning-secondary">导入进度<input type="file" accept="application/json,.json" onChange={(event) => { void restoreProgress(event.target.files?.[0]); event.target.value = ""; }} /></label></div>
      </footer>
    </>}
  </main>;
}
