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

  useEffect(() => {
    fetch("/api/settings/ai")
      .then((response) => response.json())
      .then((value: PublicAiSettings) => {
        setSettings(value);
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
    const response = await fetch("/api/settings/ai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl,
        ...(apiKey ? { apiKey } : {}),
        model,
        transcriptionModel,
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setNotice(data.error || "保存失败。");
      return;
    }
    setSettings(data as PublicAiSettings);
    setApiKey("");
    setNotice("已安全保存到服务器，新对话会立即使用。");
  }

  return (
    <main className="page-shell">
      <div className="page-heading">
        <p>模型连接</p>
        <h1>API 设置</h1>
        <span>Key 只保存在服务器 Docker 数据卷，不会显示在页面源码或 GitHub。</span>
      </div>

      {!settings ? <div className="loading-card">正在读取 API 设置…</div> : (
        <form className="settings-card" onSubmit={save}>
          <div className={`connection-status ${settings.apiKeyConfigured ? "connected" : "demo"}`}>
            <span />
            <div>
              <strong>{settings.apiKeyConfigured ? `已配置 ${settings.apiKeyHint ?? "API Key"}` : "当前为演示模式"}</strong>
              <small>{settings.source === "saved" ? "使用网页保存的服务器设置" : settings.source === "environment" ? "使用 Docker 环境变量" : "配置 Key 后启用图片理解和真实 Agent"}</small>
            </div>
          </div>

          <div className="form-stack">
            <label>API 地址<input type="url" value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://cf.api.fan/v1" inputMode="url" /><small>必须是 HTTPS；使用 OpenAI 官方时可留空。</small></label>
            <label>API Key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={settings.apiKeyConfigured ? "留空表示保持现有 Key" : "输入新 Key"} autoComplete="new-password" /><small>保存后不再显示明文，仅显示末四位。</small></label>
            <label>对话 / 图片模型 ID<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="填写服务商支持 Responses API 和图片的模型 ID" /></label>
            <label>语音转写模型 ID<input value={transcriptionModel} onChange={(event) => setTranscriptionModel(event.target.value)} placeholder="gpt-4o-mini-transcribe" /><small>第三方服务如果不支持语音转写，语音按钮仍会报错，不影响文字和照片。</small></label>
          </div>
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <button className="save-button" disabled={saving}>{saving ? "正在安全保存…" : "保存 API 设置"}</button>
        </form>
      )}
    </main>
  );
}
