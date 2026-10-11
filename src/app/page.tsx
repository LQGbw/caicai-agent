"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentDecision } from "@/lib/domain/types";

const recommendationLabel = { buy: "可以买", skip: "先不买", uncertain: "信息不足" };
const verdictLabel = { low: "偏低", normal: "正常", high: "偏高", insufficient_data: "样本不足" };
const confidenceLabel = { low: "低", medium: "中", high: "高" };

type ConversationItem =
  | { id: string; role: "user"; text: string; hasImage: boolean }
  | { id: string; role: "assistant"; decision: AgentDecision }
  | { id: string; role: "error"; text: string };

function DecisionBubble({ decision }: { decision: AgentDecision }) {
  return (
    <article className={`assistant-card decision-${decision.recommendation}`}>
      <div className="answer-status">
        <span>{recommendationLabel[decision.recommendation]}</span>
        <small>置信度 {confidenceLabel[decision.confidence]}</small>
      </div>
      <h2>{decision.headline}</h2>
      <div className="food-line">
        <strong>{decision.foodName}</strong>
        <span>{decision.observedPrice === null ? "未识别价格" : `${decision.observedPrice} 元/${decision.observedUnit}`}</span>
        <span>价格{verdictLabel[decision.priceVerdict]}</span>
      </div>
      <div className="answer-section">
        <h3>为什么</h3>
        <ul>{decision.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
      </div>
      <div className="answer-section evidence-section">
        <h3>判断依据</h3>
        <ul>{decision.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <div className="quick-advice">
        <div><span>怎么放</span><p>{decision.storageAdvice}</p></div>
        <div><span>怎么做</span><p>{decision.easyCookingAdvice}</p></div>
      </div>
      <footer>
        <span>{decision.observationSaved ? "✓ 已记入个人价格历史" : "本次未记录价格"}</span>
        {decision.mode === "demo" && <Link href="/settings">演示模式 · 去配置 API</Link>}
      </footer>
    </article>
  );
}

export default function Home() {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const preview = useMemo(() => image ? URL.createObjectURL(image) : null, [image]);

  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation, loading]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const question = message.trim();
    if ((!question && !image) || loading) return;
    const form = new FormData();
    form.append("message", question);
    if (image) form.append("image", image);
    setConversation((items) => [...items, { id: crypto.randomUUID(), role: "user", text: question || "请帮我看看这张照片", hasImage: Boolean(image) }]);
    setMessage("");
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLoading(true);
    try {
      const response = await fetch("/api/agent", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "分析失败");
      setConversation((items) => [...items, { id: crypto.randomUUID(), role: "assistant", decision: data as AgentDecision }]);
    } catch (caught) {
      setConversation((items) => [...items, { id: crypto.randomUUID(), role: "error", text: caught instanceof Error ? caught.message : "分析失败" }]);
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
        try {
          const response = await fetch("/api/transcribe", { method: "POST", body: form });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "转写失败");
          setMessage(data.text);
        } catch (caught) {
          setConversation((items) => [...items, { id: crypto.randomUUID(), role: "error", text: caught instanceof Error ? caught.message : "转写失败" }]);
        } finally {
          setLoading(false);
        }
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
    } catch {
      setConversation((items) => [...items, { id: crypto.randomUUID(), role: "error", text: "无法使用麦克风，请检查浏览器权限。" }]);
    }
  }

  return (
    <main className="chat-page">
      <section className="conversation" aria-live="polite">
        <div className="welcome-message">
          <span className="assistant-avatar">菜</span>
          <div><p>我是菜菜参谋。在货架前不知道贵不贵、值不值得买，拍给我就行。</p><small>可以同时发照片和语音</small></div>
        </div>
        {conversation.length === 0 && <div className="suggestions">{["这个菜贵不贵？", "我家里还有这个吗？", "这个怎么放才不容易坏？"].map((text) => <button key={text} type="button" onClick={() => setMessage(text)}>{text}</button>)}</div>}
        {conversation.map((item) => {
          if (item.role === "user") return <div className="user-row" key={item.id}><div className="user-bubble">{item.hasImage && <span>📷 已附照片</span>}<p>{item.text}</p></div></div>;
          if (item.role === "error") return <div className="assistant-row" key={item.id}><span className="assistant-avatar">菜</span><div className="chat-error">{item.text}</div></div>;
          return <div className="assistant-row" key={item.id}><span className="assistant-avatar">菜</span><DecisionBubble decision={item.decision} /></div>;
        })}
        {loading && <div className="assistant-row"><span className="assistant-avatar">菜</span><div className="thinking"><i /><i /><i /><span>正在判断…</span></div></div>}
        <div ref={endRef} />
      </section>

      <div className="composer-wrap">
        {preview && <div className="composer-preview"><Image unoptimized width={72} height={72} src={preview} alt="待分析的食材或价签" /><button type="button" onClick={() => setImage(null)} aria-label="移除图片">×</button></div>}
        <form className="composer" onSubmit={submit}>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={1} placeholder="说说你看到了什么…" aria-label="买菜问题" />
          <div className="composer-actions">
            <label className="icon-button" title="拍照或选择照片"><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /><span aria-hidden>▣</span><b>照片</b></label>
            <button type="button" className={`icon-button ${recording ? "recording" : ""}`} onClick={toggleRecording}><span aria-hidden>●</span><b>{recording ? "停止" : "语音"}</b></button>
            <button className="send-button" type="submit" disabled={loading || (!message.trim() && !image)} aria-label="发送">↑</button>
          </div>
        </form>
        <p className="composer-note">价格观察会写入个人历史，不会自动记为已购买。</p>
      </div>
    </main>
  );
}
