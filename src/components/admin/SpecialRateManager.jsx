import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CATEGORY_ICONS, getCategoryById } from "@/lib/categoryIcons";
import { LP_TEMPLATES } from "@/lib/lpTemplate";
import { Plus, Trash2, Save, TrendingUp, Link as LinkIcon } from "lucide-react";

const DEFAULT_RATES = [
  { category_id: "fitness",   label: "フィットネス・ヨガ",     rate: 85, free_months: 12, slots: 50,  active: true },
  { category_id: "expert",    label: "有識者・講演",           rate: 85, free_months: 12, slots: null, active: true },
  { category_id: "tutor",     label: "家庭教師・教育",         rate: 90, free_months: 12, slots: 100, active: true },
  { category_id: "fortune",   label: "占い師",                 rate: 85, free_months: 12, slots: null, active: true },
  { category_id: "musician",  label: "ミュージシャン",         rate: 85, free_months: 12, slots: null, active: true },
  { category_id: "lawyer",    label: "士業",                   rate: 85, free_months: 12, slots: 30,  active: false },
  { category_id: "cooking",   label: "料理・フード",           rate: 85, free_months: 12, slots: 50,  active: false },
  { category_id: "pet",       label: "ペット・動物",           rate: 85, free_months: 12, slots: 50,  active: false },
];

function RateRow({ item, onUpdate, onDelete }) {
  const cat = getCategoryById(item.category_id);
  return (
    <tr className="border-b border-border/30 hover:bg-secondary/30">
      {/* カテゴリ */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cat.emoji}</span>
          <div>
            <p className="text-xs font-bold">{item.label}</p>
            <p className="text-[10px] text-muted-foreground">{item.category_id}</p>
          </div>
        </div>
      </td>
      {/* 還元率 */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={50} max={100}
            value={item.rate}
            onChange={(e) => onUpdate({ ...item, rate: Number(e.target.value) })}
            className="w-20 h-8 text-center text-sm font-black bg-secondary border-0"
          />
          <span className="text-xs text-muted-foreground font-bold">%</span>
        </div>
      </td>
      {/* 無料期間 */}
      <td className="py-3 px-3">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={0} max={36}
            value={item.free_months ?? 0}
            onChange={(e) => onUpdate({ ...item, free_months: Number(e.target.value) })}
            className="w-20 h-8 text-center text-sm bg-secondary border-0"
          />
          <span className="text-xs text-muted-foreground">ヶ月</span>
        </div>
      </td>
      {/* 先着枠 */}
      <td className="py-3 px-3">
        <Input
          type="number"
          min={0}
          value={item.slots ?? ""}
          placeholder="無制限"
          onChange={(e) => onUpdate({ ...item, slots: e.target.value ? Number(e.target.value) : null })}
          className="w-24 h-8 text-center text-sm bg-secondary border-0"
        />
      </td>
      {/* 有効 */}
      <td className="py-3 px-3 text-center">
        <button
          onClick={() => onUpdate({ ...item, active: !item.active })}
          className={`text-xs font-black px-3 py-1 rounded-full transition-all ${
            item.active
              ? "bg-green-500/20 text-green-400 border border-green-500/40"
              : "bg-secondary text-muted-foreground border border-border/40"
          }`}
        >
          {item.active ? "有効" : "停止"}
        </button>
      </td>
      {/* 削除 */}
      <td className="py-3 px-3 text-center">
        <button onClick={() => onDelete(item.category_id)} className="text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

export default function SpecialRateManager() {
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [saving, setSaving] = useState(false);
  const [newCatId, setNewCatId] = useState("");

  const handleUpdate = (updated) => {
    setRates((prev) => prev.map((r) => r.category_id === updated.category_id ? updated : r));
  };

  const handleDelete = (catId) => {
    setRates((prev) => prev.filter((r) => r.category_id !== catId));
  };

  const handleAdd = () => {
    if (!newCatId) return;
    const exists = rates.find((r) => r.category_id === newCatId);
    if (exists) { toast.error("すでに存在するカテゴリです"); return; }
    const cat = getCategoryById(newCatId);
    setRates((prev) => [...prev, {
      category_id: newCatId,
      label: cat.label,
      rate: 85,
      free_months: 12,
      slots: null,
      active: false,
    }]);
    setNewCatId("");
  };

  const handleSave = async () => {
    setSaving(true);
    // AdminDashboardのプログレッシブレートマスターへ保存するイメージ
    // 実際には ProgressiveRateMaster エンティティや admin設定エンティティに書き込む
    await new Promise((r) => setTimeout(r, 800));
    toast.success("✅ 特別料率を保存しました");
    setSaving(false);
  };

  // LPテンプレート状況
  const publishedLPs = LP_TEMPLATES.filter((t) => t.published);
  const draftLPs = LP_TEMPLATES.filter((t) => !t.published);

  return (
    <div className="space-y-8">

      {/* ── 特別料率テーブル ── */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-black">職種別・特別還元率設定</h3>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2 bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4" />
            {saving ? "保存中..." : "変更を保存"}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50">
                <th className="text-left py-3 px-3 font-bold">職種カテゴリ</th>
                <th className="text-left py-3 px-3 font-bold">還元率</th>
                <th className="text-left py-3 px-3 font-bold">無料期間</th>
                <th className="text-left py-3 px-3 font-bold">先着枠</th>
                <th className="text-center py-3 px-3 font-bold">状態</th>
                <th className="text-center py-3 px-3 font-bold">削除</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((item) => (
                <RateRow key={item.category_id} item={item} onUpdate={handleUpdate} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>

        {/* 新規追加 */}
        <div className="px-5 py-4 border-t border-border/50 flex items-center gap-3 flex-wrap">
          <select
            value={newCatId}
            onChange={(e) => setNewCatId(e.target.value)}
            className="flex-1 min-w-40 rounded-xl bg-secondary border-0 px-3 py-2 text-sm focus:outline-none"
          >
            <option value="">カテゴリを選択して追加</option>
            {CATEGORY_ICONS.filter((c) => !rates.find((r) => r.category_id === c.id)).map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
            ))}
          </select>
          <Button size="sm" onClick={handleAdd} disabled={!newCatId} className="gap-2">
            <Plus className="w-4 h-4" /> 追加
          </Button>
        </div>
      </div>

      {/* ── LP テンプレート一覧 ── */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-amber-400" />
          <h3 className="font-black">LPテンプレート管理</h3>
          <span className="ml-auto text-xs text-muted-foreground">公開中 {publishedLPs.length} / 下書き {draftLPs.length}</span>
        </div>

        <div className="p-5 space-y-4">
          {/* 公開中 */}
          <p className="text-xs font-bold text-green-400 tracking-widest uppercase">● 公開中</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {publishedLPs.map((t) => (
              <a key={t.id} href={t.path} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-all group">
                <span className="text-2xl">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.revenueRate}%還元 / {t.freeMonths}ヶ月無料{t.slots ? ` / 先着${t.slots}名` : ""}</p>
                </div>
                <span className="text-xs text-green-400 group-hover:text-green-300">→</span>
              </a>
            ))}
          </div>

          {/* 下書き */}
          <p className="text-xs font-bold text-amber-400 tracking-widest uppercase mt-4">○ 下書き（画像・文言を差し替えるだけで即公開可能）</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {draftLPs.map((t) => (
              <div key={t.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <span className="text-2xl opacity-50">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-muted-foreground truncate">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.revenueRate}%還元 / {t.freeMonths}ヶ月無料{t.slots ? ` / 先着${t.slots}名` : ""}</p>
                  <p className="text-[10px] text-amber-400 mt-0.5">テンプレート準備済み → 画像・文言差替で即公開</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── カテゴリアイコン一覧 ── */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="font-black">職種カテゴリ・アイコンセット（全{CATEGORY_ICONS.length}種）</h3>
          <p className="text-xs text-muted-foreground mt-1">lib/categoryIcons.js にエントリを追加することで新カテゴリを即追加できます</p>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {CATEGORY_ICONS.map((c) => (
            <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-secondary/50 border border-border/30">
              <span className="text-xl">{c.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{c.label}</p>
                <p className="text-[9px] text-muted-foreground font-mono">{c.id}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}