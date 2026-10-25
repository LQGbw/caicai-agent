"use client";

import { useEffect, useState } from "react";
import type { PublicAiSettings } from "@/lib/settings/ai-settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<PublicAiSettings | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [transcriptionModel, setTranscriptionModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [testing, setTesting] = useState(false);
  const [protocol, setProtocol] = useState<PublicAiSettings["protocol"]>("auto");

  useEffect(() => {
    fetch("/api/settings/ai")
      .then(async (response) => { if (!response.ok) throw new Error("设置读取失败"); return response.json(); })
      .then((value: PublicAiSettings) => {
        setSettings(value);
        setProtocol(value.protocol ?? "auto");
        setBaseUrl(value.baseUrl);
        setModel(value.model);
        setTranscriptionModel(value.transcriptionModel);
      })
      .catch(() => setNotice("设置读取失败，请刷新重试。"));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
    const response = await fetch("/api/settings/ai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl,
        ...(apiKey ? { apiKey } : {}),
        model,
        transcriptionModel,
        protocol,
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setNotice(data.error || "保存失败。");
      return;
    }
    setSettings(data as PublicAiSettings);
    setBaseUrl(data.baseUrl);
    setApiKey("");
    setDirty(false);
    setNotice("已安全保存到服务器，新对话会立即使用。");
    } catch { setNotice("保存请求失败，尚未保存。请检查网络或重新登录；已填内容仍保留在本页。"); }
    finally { setSaving(false); }
  }

  async function testConnection() {
    setTesting(true); setNotice(null);
    try {
      const response = await fetch("/api/settings/ai/test", { method: "POST" });
      const data = await response.json();
      setNotice(response.ok ? `连接通过：${data.model}（${data.protocol}）。这验证文本连接，不代表图片和语音均受支持。` : data.error || "连接失败。");
    } catch { setNotice("连接测试未完成，请检查网络或登录状态。"); }
    finally { setTesting(false); }
  }

  return (
    <main className="page-shell">
      <div className="page-heading">
        <p>模型连接</p>
        <h1>API 设置</h1>
        <span>Key 只保存在服务器 Docker 数据卷，不会显示在页面源码或 GitHub。</span>
      </div>

      {!settings ? <div className="loading-card" role="status">{notice || "正在读取 API 设置…"}</div> : (
        <form className="settings-card" onSubmit={save} onChange={() => setDirty(true)}>
          {dirty && <p className="form-notice" role="status">已填写，但尚未保存。请点击下方“保存 API 设置”后再离开。</p>}
          <div className={`connection-status ${settings.apiKeyConfigured ? "connected" : "demo"}`}>
            <span />
            <div>
              <strong>{settings.apiKeyConfigured ? `服务器已保存 ${settings.apiKeyHint ?? "API Key"}` : "服务器尚未保存 API Key"}</strong>
              <small>{settings.source === "saved" ? "使用网页保存的服务器设置" : settings.source === "environment" ? "使用 Docker 环境变量" : "配置 Key 后启用图片理解和真实 Agent"}</small>
            </div>
          </div>

          <div className="form-stack">
            <label>接口协议<select value={protocol} onChange={(event) => setProtocol(event.target.value as PublicAiSettings["protocol"])}><option value="auto">自动：Claude 用 Anthropic，第三方 GPT 用 Chat</option><option value="anthropic">Anthropic Messages（Claude）</option><option value="chat">OpenAI 兼容 Chat Completions</option><option value="responses">OpenAI Responses</option></select><small>选服务商支持的协议；模型名称不代表接口一定通用。</small></label>
            <label>API 地址<input type="text" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.example.com/v1" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} /><small>填写服务商的 API Base URL。会清理空格、补齐 https://，并移除误填的 /chat/completions 等接口后缀。官方 OpenAI 可留空。</small></label>
            <label>API Key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={settings.apiKeyConfigured ? "留空表示保持现有 Key" : "输入新 Key"} autoComplete="new-password" /><small>保存后不再显示明文，仅显示末四位。</small></label>
            <label>对话 / 学习模型 ID<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="例如服务商支持的 qwen-flash" /><small>Demo 优先低成本文本模型。模型 ID 必须以你购买的服务商列表为准。</small></label>
            <label>语音转写模型 ID<input value={transcriptionModel} onChange={(event) => setTranscriptionModel(event.target.value)} placeholder="gpt-4o-mini-transcribe" /><small>第三方服务如果不支持语音转写，语音按钮仍会报错，不影响文字和照片。</small></label>
          </div>
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <div className="settings-actions"><button className="save-button" disabled={saving}>{saving ? "正在安全保存…" : "保存 API 设置"}</button>
          <button type="button" className="settings-test" disabled={testing || dirty || !settings.apiKeyConfigured} onClick={testConnection}>{testing ? "正在测试…" : "测试已保存的连接"}</button></div>
        </form>
      )}
    </main>
  );
}
