"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentDecision, UserProfile } from "@/lib/domain/types";

const recommendationLabel = { buy: "可以买", skip: "先不买", uncertain: "信息不足" };
const verdictLabel = { low: "偏低", normal: "正常", high: "偏高", insufficient_data: "样本不足" };
const confidenceLabel = { low: "低", medium: "中", high: "高" };
const districtByActivityArea: Record<string, string> = {
  "临平区": "临平区",
  "下沙": "钱塘区",
  "九堡": "上城区",
  "客运中心站": "上城区",
};

function parseActivityAreas(value: string): UserProfile["activityAreas"] {
  return value
    .split(/[、,，]/)
    .map((label) => label.trim())
    .filter(Boolean)
    .map((label) => ({ label, district: districtByActivityArea[label] ?? null }));
}

function DecisionCard({ decision }: { decision: AgentDecision }) {
  return (
    <section className={`decision decision-${decision.recommendation}`} aria-live="polite">
      <div className="decision-topline">
        <span className="pill">{recommendationLabel[decision.recommendation]}</span>
        <span className="muted">置信度 {confidenceLabel[decision.confidence]}</span>
      </div>
      <h2>{decision.headline}</h2>
      <div className="food-summary">
        <strong>{decision.foodName}</strong>
        <span>
          {decision.observedPrice === null ? "未识别价格" : `${decision.observedPrice} 元/${decision.observedUnit}`}
        </span>
        <span>价格：{verdictLabel[decision.priceVerdict]}</span>
      </div>

      <div className="result-grid">
        <div>
          <h3>为什么</h3>
          <ul>{decision.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
        </div>
        <div>
          <h3>判断依据</h3>
          <ul>{decision.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h3>怎么保存</h3>
          <p>{decision.storageAdvice}</p>
        </div>
        <div>
          <h3>最简单怎么做</h3>
          <p>{decision.easyCookingAdvice}</p>
        </div>
      </div>
      <footer>
        {decision.observationSaved ? "✓ 本次价格已记入个人历史" : "本次没有保存价格记录"}
        {decision.mode === "demo" && <span className="demo-badge">演示模式</span>}
      </footer>
      {decision.toolTrace && decision.toolTrace.length > 0 && (
        <details className="tool-trace">
          <summary>查看这次 Agent 调用了哪些工具</summary>
          <ol>
            {decision.toolTrace.map((item, index) => (
              <li key={`${item.tool}-${index}`}>
                <code>{item.tool}</code>
                <span className={item.status}>{item.status === "success" ? "完成" : "失败"}</span>
                <small>{item.summary}</small>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}

function ProfilePanel({ profile, onSaved }: { profile: UserProfile; onSaved: (value: UserProfile) => void }) {
  const [draft, setDraft] = useState(profile);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: draft.city || null,
        shoppingChannels: draft.shoppingChannels,
        activityAreas: draft.activityAreas,
        householdSize: Number(draft.householdSize),
        mealsPerWeek: Number(draft.mealsPerWeek),
        budgetPerMeal: draft.budgetPerMeal === null ? null : Number(draft.budgetPerMeal),
        maxCookingMinutes: draft.maxCookingMinutes === null ? null : Number(draft.maxCookingMinutes),
        cookingLevel: draft.cookingLevel,
        dislikesComplexPrep: draft.dislikesComplexPrep,
        willingToStock: draft.willingToStock,
        priceSensitivity: draft.priceSensitivity,
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (response.ok) onSaved(data as UserProfile);
  }

  return (
    <details className="profile-panel">
      <summary>我的买菜画像</summary>
      <div className="profile-grid">
        <label>城市<input value={draft.city ?? ""} onChange={(event) => setDraft({ ...draft, city: event.target.value })} placeholder="接公开价格数据前必填" /></label>
        <label>常活动区域<input value={draft.activityAreas.map((area) => area.label).join("、")} onChange={(event) => setDraft({ ...draft, activityAreas: parseActivityAreas(event.target.value) })} placeholder="临平区、下沙、九堡" /></label>
        <label>常用买菜渠道<input value={draft.shoppingChannels.join("、")} onChange={(event) => setDraft({ ...draft, shoppingChannels: event.target.value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean) })} placeholder="菜市场、小象超市、山姆" /></label>
        <label>几个人吃<input type="number" min="1" value={draft.householdSize} onChange={(event) => setDraft({ ...draft, householdSize: Number(event.target.value) })} /></label>
        <label>每周做饭次数<input type="number" min="0" value={draft.mealsPerWeek} onChange={(event) => setDraft({ ...draft, mealsPerWeek: Number(event.target.value) })} /></label>
        <label>单顿预算<input type="number" min="0" value={draft.budgetPerMeal ?? ""} onChange={(event) => setDraft({ ...draft, budgetPerMeal: event.target.value ? Number(event.target.value) : null })} /></label>
        <label>最长做饭时间<input type="number" min="0" value={draft.maxCookingMinutes ?? ""} onChange={(event) => setDraft({ ...draft, maxCookingMinutes: event.target.value ? Number(event.target.value) : null })} /></label>
        <label>做饭水平<select value={draft.cookingLevel} onChange={(event) => setDraft({ ...draft, cookingLevel: event.target.value as UserProfile["cookingLevel"] })}><option value="beginner">小白</option><option value="intermediate">会做一些</option><option value="advanced">熟练</option></select></label>
        <label>价格敏感度<select value={draft.priceSensitivity} onChange={(event) => setDraft({ ...draft, priceSensitivity: event.target.value as UserProfile["priceSensitivity"] })}><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select></label>
        <label className="check"><input type="checkbox" checked={draft.dislikesComplexPrep} onChange={(event) => setDraft({ ...draft, dislikesComplexPrep: event.target.checked })} />讨厌复杂处理</label>
        <label className="check"><input type="checkbox" checked={draft.willingToStock} onChange={(event) => setDraft({ ...draft, willingToStock: event.target.checked })} />愿意囤菜</label>
      </div>
      <button className="secondary" onClick={save} disabled={saving}>{saving ? "保存中…" : "保存画像"}</button>
    </details>
  );
}

export default function Home() {
  const [message, setMessage] = useState("鸡腿 9.9 元一斤，值得买吗？");
  const [image, setImage] = useState<File | null>(null);
  const [decision, setDecision] = useState<AgentDecision | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const preview = useMemo(() => image ? URL.createObjectURL(image) : null, [image]);

  useEffect(() => {
    fetch("/api/profile").then((response) => response.json()).then(setProfile).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setDecision(null);
    const form = new FormData();
    form.append("message", message);
    if (image) form.append("image", image);
    try {
      const response = await fetch("/api/agent", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "分析失败");
      setDecision(data as AgentDecision);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "分析失败");
    } finally {
      setLoading(false);
    }
  }

  async function toggleRecording() {
    if (recording && mediaRecorder.current) {
      mediaRecorder.current.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];
      recorder.ondataavailable = (event) => audioChunks.current.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audio = new File(audioChunks.current, "grocery-question.webm", { type: recorder.mimeType || "audio/webm" });
        const form = new FormData();
        form.append("audio", audio);
        setLoading(true);
        setError(null);
        try {
          const response = await fetch("/api/transcribe", { method: "POST", body: form });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "转写失败");
          setMessage(data.text);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "转写失败");
        } finally {
          setLoading(false);
        }
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
    } catch {
      setError("无法使用麦克风，请检查浏览器权限。" );
    }
  }

  return (
    <main>
      <header className="hero">
        <div className="brand"><span>菜</span> 菜菜参谋</div>
        <p className="eyebrow">你的个人买菜决策 Agent</p>
        <h1>不会买菜也没关系，<br />看到什么就拍给我。</h1>
        <p className="hero-copy">识别食材和价签，结合你的历史价格、库存与做饭习惯，告诉你这次值不值得买。</p>
      </header>

      <section className="workspace">
        <form className="ask-card" onSubmit={submit}>
          <div className="input-head">
            <label htmlFor="question">你想问什么？</label>
            <span>文字、语音、照片可以一起用</span>
          </div>
          <textarea id="question" value={message} onChange={(event) => setMessage(event.target.value)} rows={4} placeholder="比如：这个鸡腿 9.9 元一斤，值得买吗？" />

          {preview && <div className="preview"><Image unoptimized width={150} height={110} src={preview} alt="待分析的食材或价签" /><button type="button" onClick={() => setImage(null)} aria-label="移除图片">×</button></div>}

          <div className="actions">
            <label className="upload-button">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setImage(event.target.files?.[0] ?? null)} />
              <span aria-hidden>▧</span> 拍照 / 选照片
            </label>
            <button type="button" className={`voice-button ${recording ? "recording" : ""}`} onClick={toggleRecording}>
              <span aria-hidden>●</span> {recording ? "结束录音" : "按住思路说"}
            </button>
            <button className="primary" type="submit" disabled={loading || (!message.trim() && !image)}>{loading ? "正在判断…" : "帮我判断"}</button>
          </div>
          <p className="privacy">图片仅用于本次判断；只有明确识别出的价格观察会写入个人历史。</p>
        </form>

        <aside className="side-note">
          <span className="note-number">01</span>
          <h2>先看证据，再下结论</h2>
          <p>个人历史优先。公开批发价不会被当成你的商超零售价；样本不足时，它会直接告诉你不知道。</p>
          <div className="legend"><i className="dot personal" />个人价格历史</div>
          <div className="legend"><i className="dot public" />口径兼容的公开数据</div>
          <div className="legend"><i className="dot unknown" />信息不足</div>
        </aside>
      </section>

      {error && <div className="error" role="alert">{error}</div>}
      {decision && <DecisionCard decision={decision} />}
      {profile && <ProfilePanel profile={profile} onSaved={setProfile} />}

      <section className="how-it-works">
        <p className="eyebrow">它刚才做了什么</p>
        <div className="steps">
          {[
            ["01", "观察", "理解文字、语音和图片"],
            ["02", "查状态", "读取价格历史与库存"],
            ["03", "做判断", "区分当地价值和个人价值"],
            ["04", "记下来", "保存观察，等待真实反馈"],
          ].map(([number, title, copy]) => <div className="step" key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></div>)}
        </div>
      </section>
    </main>
  );
}
