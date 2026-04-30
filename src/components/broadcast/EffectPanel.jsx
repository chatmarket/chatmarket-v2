/**
 * EffectPanel — 配信映像エフェクト選択UI
 * props:
 *   value    — 現在のeffectKey
 *   onChange — (key) => void
 *   compact  — trueで小さいUI（通話画面用）
 */
import React from "react";
import { Sparkles } from "lucide-react";

const EFFECT_OPTIONS = [
  { key: "none",    label: "なし",     emoji: "⬜", group: "basic" },
  { key: "vivid",   label: "鮮やか",   emoji: "🎨", group: "filter" },
  { key: "cool",    label: "クール",   emoji: "❄️", group: "filter" },
  { key: "warm",    label: "ウォーム", emoji: "🌅", group: "filter" },
  { key: "bw",      label: "モノクロ", emoji: "🎞️", group: "filter" },
  { key: "vintage", label: "ヴィンテージ", emoji: "📷", group: "filter" },
  { key: "dream",   label: "ドリーム", emoji: "✨", group: "filter" },
  { key: "dark",    label: "ダーク",   emoji: "🌑", group: "overlay" },
  { key: "pink",    label: "ピンク",   emoji: "🌸", group: "overlay" },
  { key: "blue",    label: "ブルー",   emoji: "🔵", group: "overlay" },
  { key: "green",   label: "グリーン", emoji: "💚", group: "overlay" },
];

export default function EffectPanel({ value = "none", onChange, compact = false }) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {EFFECT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            title={opt.label}
            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border text-xs font-bold transition-all ${
              value === opt.key
                ? "border-primary bg-primary/20 text-primary"
                : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
            }`}
          >
            <span className="text-base leading-none">{opt.emoji}</span>
            <span className="text-[9px] leading-none">{opt.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 space-y-3">
      <h3 className="font-bold text-white text-sm flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        映像エフェクト
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {EFFECT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all ${
              value === opt.key
                ? "border-primary bg-primary/20 text-primary"
                : "border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            <span className="text-xl leading-none">{opt.emoji}</span>
            <span className="text-[10px] font-bold leading-none">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}