"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentDecision } from "@/lib/domain/types";
import { recordingFilename, recordingMimeType } from "@/lib/media/recording";

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
        {decision.mode === "demo" && <Link href="/settings" prefetch={false}>演示模式 · 去配置 API</Link>}
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
  const mediaStream = useRef<MediaStream | null>(null);
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

  useEffect(() => () => {
    const recorder = mediaRecorder.current;
    if (recorder) {
      recorder.onstop = null;
      recorder.ondataavailable = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    mediaStream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const question = message.trim();
    if ((!question && !image) || loading || recording) return;
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
      setLoading(true);
      mediaRecorder.current.stop();
      setRecording(false);
      return;
    }
    if (loading) return;
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("录音需要安全的 HTTPS 页面和支持麦克风的浏览器，请在手机系统浏览器中打开。");
      if (typeof MediaRecorder === "undefined") throw new Error("当前浏览器不支持网页录音，请改用手机键盘自带的语音输入。");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      const mimeType = recordingMimeType((mime) => MediaRecorder.isTypeSupported(mime));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunks.current = [];
      recorder.ondataavailable = (event) => audioChunks.current.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        mediaStream.current = null;
        mediaRecorder.current = null;
        setLoading(true);
        try {
          const actualMime = recorder.mimeType || audioChunks.current.find((chunk) => chunk.type)?.type || "";
          const audio = new File(audioChunks.current, recordingFilename(actualMime), { type: actualMime });
          const form = new FormData();
          form.append("audio", audio);
          const response = await fetch("/api/transcribe", { method: "POST", body: form });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "转写失败");
          setMessage((current) => current.trim() ? `${current}\n${data.text}` : data.text);
        } catch (caught) {
          setConversation((items) => [...items, { id: crypto.randomUUID(), role: "error", text: caught instanceof Error ? caught.message : "转写失败" }]);
        } finally {
          setLoading(false);
        }
      };
      recorder.onerror = () => {
        recorder.onstop = null;
        stream.getTracks().forEach((track) => track.stop());
        mediaStream.current = null; mediaRecorder.current = null;
        setRecording(false); setLoading(false);
        setConversation((items) => [...items, { id: crypto.randomUUID(), role: "error", text: "录音中断，请重试或使用手机键盘语音输入。" }]);
      };
      recorder.start();
      mediaRecorder.current = recorder;
      setRecording(true);
    } catch (error) {
      mediaStream.current?.getTracks().forEach((track) => track.stop());
      mediaStream.current = null; setRecording(false); setLoading(false);
      const text = error instanceof DOMException ? "无法使用麦克风，请检查浏览器权限，或改用手机键盘的语音输入。" : error instanceof Error ? error.message : "录音失败，请稍后重试。";
      setConversation((items) => [...items, { id: crypto.randomUUID(), role: "error", text }]);
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
            <button type="button" disabled={loading} className={`icon-button ${recording ? "recording" : ""}`} onClick={toggleRecording}><span aria-hidden>●</span><b>{recording ? "停止" : "语音"}</b></button>
            <button className="send-button" type="submit" disabled={loading || recording || (!message.trim() && !image)} aria-label="发送">↑</button>
          </div>
        </form>
        <p className="composer-note">价格观察会写入个人历史，不会自动记为已购买。</p>
      </div>
    </main>
  );
}
