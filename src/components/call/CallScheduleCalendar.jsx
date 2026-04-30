/**
 * CallScheduleCalendar
 * 通話スケジュール表示（閲覧者用）
 * call_schedule: [{date: "YYYY-MM-DD", label: string, status: "available"|"busy"|"closed"}]
 */
import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const STATUS_CONFIG = {
  available: { label: "○", bg: "bg-green-500/20", border: "border-green-500/50", text: "text-green-400", dot: "bg-green-400" },
  busy:      { label: "△", bg: "bg-yellow-500/20", border: "border-yellow-500/50", text: "text-yellow-400", dot: "bg-yellow-400" },
  closed:    { label: "×", bg: "bg-red-500/20",    border: "border-red-500/40",    text: "text-red-400",    dot: "bg-red-400" },
};

// 特別ラベルの設定
const SPECIAL_LABELS = {
  hot:       { emoji: "🔥", text: "人気枠", color: "#ff6b35" },
  recommend: { emoji: "⭐", text: "おすすめ", color: "#ffd700" },
  limited:   { emoji: "⚡", text: "残りわずか", color: "#a78bfa" },
  new:       { emoji: "✨", text: "新枠", color: "#38bdf8" },
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}
function toKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CallScheduleCalendar({ schedule = [] }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(null);

  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,"0")}-${String(tomorrow.getDate()).padStart(2,"0")}`;

  // schedule を {date: entry} のマップに変換
  const scheduleMap = {};
  schedule.forEach(s => { if (s.date) scheduleMap[s.date] = s; });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const monthNames = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  const dayNames = ["日","月","火","水","木","金","土"];

  const selectedEntry = selected ? scheduleMap[selected] : null;

  // カレンダーの日付セル生成
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <p className="font-bold text-sm">{viewYear}年 {monthNames[viewMonth]}</p>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-3">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map((d, i) => (
            <div key={d} className={`text-center text-[10px] font-bold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const key = toKey(viewYear, viewMonth, day);
            const entry = scheduleMap[key];
            const cfg = entry ? STATUS_CONFIG[entry.status] : null;
            const isToday = key === toKey(today.getFullYear(), today.getMonth(), today.getDate());
            const isSelected = selected === key;
            const dayOfWeek = (firstDay + day - 1) % 7;

            const specialLabelKey = entry?.special_label;
            const specialCfg = specialLabelKey ? SPECIAL_LABELS[specialLabelKey] : null;

            return (
              <button
                key={key}
                onClick={() => setSelected(isSelected ? null : key)}
                className={`
                  relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs font-bold transition-all
                  ${cfg ? `${cfg.bg} ${cfg.border} border` : "hover:bg-white/5"}
                  ${isToday ? "ring-2 ring-primary/60" : ""}
                  ${isSelected ? "ring-2 ring-white/40" : ""}
                `}
              >
                <span className={`text-[11px] leading-none ${dayOfWeek === 0 ? "text-red-400" : dayOfWeek === 6 ? "text-blue-400" : ""}`}>
                  {day}
                </span>
                {cfg && (
                  <span className={`text-[10px] font-black mt-0.5 ${cfg.text}`}>{cfg.label}</span>
                )}
                {/* 特別ラベルバッジ */}
                {specialCfg && (
                  <span
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black rounded-full px-1 py-0 whitespace-nowrap leading-4"
                    style={{ background: specialCfg.color, color: "#000" }}
                  >
                    {specialCfg.emoji}
                  </span>
                )}
                {/* 今日・明日インジケーター（特別ラベルがない場合） */}
                {!specialCfg && (key === todayKey) && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black bg-primary text-primary-foreground rounded-full px-1 py-0 whitespace-nowrap leading-4">今日</span>
                )}
                {!specialCfg && (key === tomorrowKey) && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black bg-blue-500 text-white rounded-full px-1 py-0 whitespace-nowrap leading-4">明日</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`text-xs font-black ${cfg.text}`}>{cfg.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {key === "available" ? "対応可" : key === "busy" ? "要確認" : "対応不可"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 選択日の詳細 */}
      {selectedEntry && (
        <div className={`mx-3 mb-3 p-3 rounded-xl border ${STATUS_CONFIG[selectedEntry.status]?.bg} ${STATUS_CONFIG[selectedEntry.status]?.border}`}>
          <p className="text-xs font-bold text-foreground">{selectedEntry.date}</p>
          {selectedEntry.label && (
            <p className="text-sm text-muted-foreground mt-1">{selectedEntry.label}</p>
          )}
          <p className={`text-xs font-black mt-1 ${STATUS_CONFIG[selectedEntry.status]?.text}`}>
            {selectedEntry.status === "available" ? "○ 対応可能" : selectedEntry.status === "busy" ? "△ 要確認" : "× 対応不可"}
          </p>
        </div>
      )}
    </div>
  );
}