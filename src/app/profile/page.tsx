"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/domain/types";

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

export default function ProfilePage() {
  const [draft, setDraft] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((response) => response.json())
      .then(setDraft)
      .catch(() => setNotice("画像读取失败，请刷新重试。"));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setNotice(null);
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      setNotice(data.error || "保存失败。");
      return;
    }
    setDraft(data as UserProfile);
    setNotice("已保存，下次判断会使用新画像。");
  }

  return (
    <main className="page-shell">
      <div className="page-heading">
        <p>个人化依据</p>
        <h1>我的买菜画像</h1>
        <span>只收集会影响采购建议的信息，不根据收入推测消费能力。</span>
      </div>

      {!draft ? <div className="loading-card">正在读取画像…</div> : (
        <form className="settings-card" onSubmit={save}>
          <div className="form-grid">
            <label>城市<input value={draft.city ?? ""} onChange={(event) => setDraft({ ...draft, city: event.target.value || null })} placeholder="杭州" /></label>
            <label>常活动区域<input value={draft.activityAreas.map((area) => area.label).join("、")} onChange={(event) => setDraft({ ...draft, activityAreas: parseActivityAreas(event.target.value) })} placeholder="临平区、下沙、九堡" /></label>
            <label className="wide">常用买菜渠道<input value={draft.shoppingChannels.join("、")} onChange={(event) => setDraft({ ...draft, shoppingChannels: event.target.value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean) })} placeholder="菜市场、小象超市、山姆" /></label>
            <label>几个人吃<input type="number" min="1" value={draft.householdSize} onChange={(event) => setDraft({ ...draft, householdSize: Number(event.target.value) })} /></label>
            <label>每周做饭次数<input type="number" min="0" value={draft.mealsPerWeek} onChange={(event) => setDraft({ ...draft, mealsPerWeek: Number(event.target.value) })} /></label>
            <label>单顿预算（元）<input type="number" min="0" value={draft.budgetPerMeal ?? ""} onChange={(event) => setDraft({ ...draft, budgetPerMeal: event.target.value ? Number(event.target.value) : null })} /></label>
            <label>最长做饭时间（分钟）<input type="number" min="0" value={draft.maxCookingMinutes ?? ""} onChange={(event) => setDraft({ ...draft, maxCookingMinutes: event.target.value ? Number(event.target.value) : null })} /></label>
            <label>做饭水平<select value={draft.cookingLevel} onChange={(event) => setDraft({ ...draft, cookingLevel: event.target.value as UserProfile["cookingLevel"] })}><option value="beginner">小白</option><option value="intermediate">会做一些</option><option value="advanced">熟练</option></select></label>
            <label>价格敏感度<select value={draft.priceSensitivity} onChange={(event) => setDraft({ ...draft, priceSensitivity: event.target.value as UserProfile["priceSensitivity"] })}><option value="low">低</option><option value="medium">中</option><option value="high">高</option></select></label>
          </div>
          <div className="toggle-list">
            <label><input type="checkbox" checked={draft.dislikesComplexPrep} onChange={(event) => setDraft({ ...draft, dislikesComplexPrep: event.target.checked })} /><span><strong>讨厌复杂处理</strong><small>优先推荐少切配、低失败率食材</small></span></label>
            <label><input type="checkbox" checked={draft.willingToStock} onChange={(event) => setDraft({ ...draft, willingToStock: event.target.checked })} /><span><strong>愿意囤菜</strong><small>价格合适时可推荐多买一些</small></span></label>
          </div>
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <button className="save-button" disabled={saving}>{saving ? "保存中…" : "保存画像"}</button>
        </form>
      )}
    </main>
  );
}
