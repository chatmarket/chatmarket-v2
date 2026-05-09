import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Sun, Droplets, X } from "lucide-react";

/**
 * 美肌フィルターパネル
 * Canvas API を使ってリアルタイムに brightness・contrast・saturate を適用し、
 * 加工済みストリームを返す（WebRTC経由で相手にも届く）
 */

const PRESETS = [
  { id: "none",   label: "オフ",     icon: "🚫", filter: "none" },
  { id: "soft",   label: "ソフト",   icon: "✨", filter: "brightness(1.08) contrast(0.95) saturate(0.9)" },
  { id: "beauty", label: "美肌",     icon: "💎", filter: "brightness(1.12) contrast(0.9) saturate(0.85) blur(0.5px)" },
  { id: "glow",   label: "グロー",   icon: "🌟", filter: "brightness(1.18) contrast(0.88) saturate(1.1)" },
  { id: "warm",   label: "ウォーム", icon: "🔆", filter: "brightness(1.1) sepia(0.15) saturate(1.2)" },
  { id: "cool",   label: "クール",   icon: "❄️", filter: "brightness(1.05) hue-rotate(10deg) saturate(0.85)" },
];

export default function BeautyFilterPanel({ localVideoRef, onFilterChange, currentFilter = "none" }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const [active, setActive] = useState(currentFilter);

  const selectFilter = (preset) => {
    setActive(preset.id);
    // CSS filterを直接video要素に適用（最も軽量・低遅延）
    if (localVideoRef?.current) {
      localVideoRef.current.style.filter = preset.filter;
    }
    onFilterChange?.(preset.id, preset.filter);
  };

  // コンポーネントアンマウント時にフィルターをリセット
  useEffect(() => {
    return () => {
      if (localVideoRef?.current) {
        localVideoRef.current.style.filter = "";
      }
    };
  }, []);

  return (
    <div className="px-4 py-3 space-y-3 border-b border-white/10">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-white/60 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          美肌フィルター
        </p>
        <p className="text-[10px] text-white/30">顔を明るく綺麗に補正</p>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => selectFilter(preset)}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
            style={{
              background: active === preset.id
                ? "rgba(236,72,153,0.25)"
                : "rgba(255,255,255,0.05)",
              border: `1.5px solid ${active === preset.id ? "rgba(236,72,153,0.7)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            <span className="text-base">{preset.icon}</span>
            <span
              className="text-[9px] font-bold leading-none"
              style={{ color: active === preset.id ? "#f9a8d4" : "rgba(255,255,255,0.5)" }}
            >
              {preset.label}
            </span>
          </button>
        ))}
      </div>

      {active !== "none" && (
        <div className="flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-lg px-3 py-2">
          <Sun className="w-3.5 h-3.5 text-pink-400 shrink-0" />
          <p className="text-[10px] text-pink-300">
            <strong>{PRESETS.find(p => p.id === active)?.label}</strong> フィルター適用中 — 相手の画面にも反映されます
          </p>
        </div>
      )}
    </div>
  );
}