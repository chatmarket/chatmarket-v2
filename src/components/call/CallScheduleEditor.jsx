/**
 * CallScheduleEditor
 * ライバー用：通話スケジュール管理カレンダー（設定画面に埋め込み）
 */
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_OPTIONS = [
  { value: "available", label: "○ 対応可能", color: "text-green-400", bg: "bg-green-500/20 border-green-500/50" },
  { value: "busy",      label: "△ 要確認",   color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/50" },
  { value: "closed",    label: "× 対応不可",  color: "text-red-400",    bg: "bg-red-500/20 border-red-500/40" },
];

const SPECIAL_LABEL_OPTIONS = [
  { value: null,       emoji: "—",  label: "なし" },
  { value: "hot",      emoji: "🔥", label: "人気枠",    color: "#ff6b35" },
  { value: "recommend",emoji: "⭐", label: "おすすめ",  color: "#ffd700" },
  { value: "limited",  emoji: "⚡", label: "残りわずか", color: "#a78bfa" },
  { value: "new",      emoji: "✨", label: "新枠",      color: "#38bdf8" },
];

const STATUS_DISPLAY = {
  available: { label: "○", text: "text-green-400", bg: "bg-green-500/20 border-green-500/40" },
  busy:      { label: "△", text: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/40" },
  closed:    { label: "×", text: "text-red-400",    bg: "bg-red-500/20 border-red-500/40" },
};

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }
function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CallScheduleEditor({ schedule = [], onChange }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editStatus, setEditStatus] = useState("available");
  const [editSpecialLabel, setEditSpecialLabel] = useState(null);

  const scheduleMap = {};
  schedule.forEach(s => { if (s.date) scheduleMap[s.date] = s; });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const monthNames = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  const dayNames = ["日","月","火","水","木","金","土"];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleSelectDay = (key) => {
    setSelected(key);
    const existing = scheduleMap[key];
    setEditLabel(existing?.label || "");
    setEditStatus(existing?.status || "available");
    setEditSpecialLabel(existing?.special_label || null);
  };

  const handleSaveEntry = () => {
    if (!selected) return;
    const updated = schedule.filter(s => s.date !== selected);
    const entry = { date: selected, label: editLabel, status: editStatus };
    if (editSpecialLabel) entry.special_label = editSpecialLabel;
    updated.push(entry);
    updated.sort((a, b) => a.date.localeCompare(b.date));
    onChange(updated);
    setSelected(null);
    setEditLabel("");
  };

  const handleDeleteEntry = (date) => {
    onChange(schedule.filter(s => s.date !== date));
    if (selected === date) setSelected(null);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-secondary/40 border border-border overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <p className="font-bold text-sm">{viewYear}年 {monthNames[viewMonth]}</p>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-7 mb-1">
            {dayNames.map((d, i) => (
              <div key={d} className={`text-center text-[10px] font-bold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const key = toKey(viewYear, viewMonth, day);
              const entry = scheduleMap[key];
              const cfg = entry ? STATUS_DISPLAY[entry.status] : null;
              const isToday = key === toKey(today.getFullYear(), today.getMonth(), today.getDate());
              const isSelected = selected === key;
              const dayOfWeek = (firstDay + day - 1) % 7;
              return (
                <button
                  key={key}
                  onClick={() => handleSelectDay(key)}
                  className={`
                    flex flex-col items-center justify-center rounded-lg py-1.5 text-xs font-bold transition-all border
                    ${cfg ? `${cfg.bg}` : "border-transparent hover:bg-white/5"}
                    ${isToday ? "ring-2 ring-primary/60" : ""}
                    ${isSelected ? "ring-2 ring-white/60 scale-105" : ""}
                  `}
                >
                  <span className={`text-[11px] leading-none ${dayOfWeek === 0 ? "text-red-400" : dayOfWeek === 6 ? "text-blue-400" : ""}`}>{day}</span>
                  {cfg && <span className={`text-[10px] font-black mt-0.5 ${cfg.text}`}>{cfg.label}</span>}
                  {!cfg && <span className="text-[10px] mt-0.5 text-white/20"><Plus className="w-2.5 h-2.5" /></span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 編集パネル */}
      {selected && (
        <div className="rounded-xl bg-card border border-primary/30 p-4 space-y-3">
          <p className="text-xs font-bold text-primary">{selected} の設定</p>
          <div className="grid grid-cols-3 gap-2">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setEditStatus(opt.value)}
                className={`py-2.5 rounded-xl border text-xs font-black transition-all ${editStatus === opt.value ? opt.bg + " border" : "border-border bg-secondary"} ${opt.color}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* 特別ラベル */}
          <div>
            <p className="text-[10px] text-muted-foreground font-bold mb-1.5">特別ラベル（任意）</p>
            <div className="grid grid-cols-5 gap-1.5">
              {SPECIAL_LABEL_OPTIONS.map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setEditSpecialLabel(opt.value)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-lg border text-xs transition-all ${editSpecialLabel === opt.value ? "border-white/50 bg-white/10" : "border-border bg-secondary"}`}
                >
                  <span className="text-base leading-none">{opt.emoji}</span>
                  <span className="text-[9px] text-muted-foreground leading-none">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={editLabel}
            onChange={e => setEditLabel(e.target.value)}
            placeholder="メモ（例: 午後から対応可）"
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setSelected(null)}>キャンセル</Button>
            <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSaveEntry}>保存</Button>
          </div>
        </div>
      )}

      {/* 登録済みリスト */}
      {schedule.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">登録済みスケジュール</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {schedule.slice().sort((a, b) => a.date.localeCompare(b.date)).map(s => {
              const cfg = STATUS_DISPLAY[s.status];
              return (
                <div key={s.date} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${cfg?.bg}`}>
                  <span className={`text-sm font-black ${cfg?.text}`}>{cfg?.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">{s.date}</p>
                    {s.label && <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>}
                  </div>
                  <button onClick={() => handleDeleteEntry(s.date)} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}