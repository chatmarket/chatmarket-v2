/**
 * CallSettingsPanel — 通話画面の設定パネル（デバイス選択 + 美肌フィルター + 映像エフェクト）
 */
import React from "react";
import { Sparkles } from "lucide-react";

const BEAUTY_PRESETS = [
  { key: "none",   label: "オフ",     emoji: "🚫", filter: "" },
  { key: "soft",   label: "ソフト",   emoji: "✨", filter: "brightness(1.08) contrast(0.95) saturate(0.9)" },
  { key: "beauty", label: "美肌",     emoji: "💎", filter: "brightness(1.12) contrast(0.9) saturate(0.85) blur(0.5px)" },
  { key: "glow",   label: "グロー",   emoji: "🌟", filter: "brightness(1.18) contrast(0.88) saturate(1.1)" },
  { key: "warm",   label: "ウォーム", emoji: "🔆", filter: "brightness(1.1) sepia(0.15) saturate(1.2)" },
  { key: "cool",   label: "クール",   emoji: "❄️", filter: "brightness(1.05) hue-rotate(10deg) saturate(0.85)" },
];

const VIDEO_EFFECTS = [
  { key: "none",    label: "なし",   emoji: "⬜", filter: "" },
  { key: "vivid",   label: "鮮やか", emoji: "🎨", filter: "saturate(1.8) contrast(1.1)" },
  { key: "bw",      label: "モノクロ",emoji: "🎞️", filter: "grayscale(1)" },
  { key: "vintage", label: "レトロ", emoji: "📷", filter: "sepia(0.6) contrast(1.1) brightness(0.9)" },
];

export default function CallSettingsPanel({
  videoDevices, audioDevices,
  selectedCameraId, selectedMicId,
  switchCamera, switchMic,
  effectKey, onEffectChange,
  localVideoRef,
}) {
  const handleEffect = (opt) => {
    onEffectChange(opt.key);
    if (localVideoRef?.current) localVideoRef.current.style.filter = opt.filter;
  };

  const handleBeauty = (preset) => {
    onEffectChange(preset.key);
    if (localVideoRef?.current) localVideoRef.current.style.filter = preset.filter;
  };

  return (
    <div className="border-b border-white/10 px-4 py-3 shrink-0 space-y-3">
      {videoDevices.length > 0 && (
        <div>
          <label className="text-xs text-white/50 mb-1 block">📹 カメラ</label>
          <select value={selectedCameraId || ""} onChange={e => switchCamera(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs focus:outline-none">
            {videoDevices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId} className="bg-black">{d.label || `カメラ ${i+1}`}</option>
            ))}
          </select>
          <button
            onClick={async () => {
              const VIRTUAL_KW = ['obs', 'virtual', 'manycam', 'xsplit', 'snap camera', 'droidcam', 'iriun', 'mmhmm', 'camo'];
              const physicals = videoDevices.filter(d => !VIRTUAL_KW.some(k => (d.label||'').toLowerCase().includes(k)));
              const target = physicals.find(d => d.deviceId !== selectedCameraId) || physicals[0];
              if (target) await switchCamera(target.deviceId);
            }}
            className="mt-1.5 w-full px-3 py-2 rounded-lg bg-primary/20 border border-primary/40 text-primary text-xs font-bold hover:bg-primary/30 transition-all"
          >
            📷 物理カメラへ強制切り替え
          </button>
        </div>
      )}
      {audioDevices.length > 1 && (
        <div>
          <label className="text-xs text-white/50 mb-1 block">🎙️ マイク</label>
          <select value={selectedMicId || ""} onChange={e => switchMic(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs focus:outline-none">
            {audioDevices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId} className="bg-black">{d.label || `マイク ${i+1}`}</option>
            ))}
          </select>
        </div>
      )}
      {/* 美肌フィルター */}
      <div>
        <label className="text-xs font-bold mb-1.5 flex items-center gap-1.5 text-pink-400">
          <Sparkles className="w-3.5 h-3.5" /> 美肌フィルター
        </label>
        <div className="grid grid-cols-6 gap-1">
          {BEAUTY_PRESETS.map(preset => (
            <button key={preset.key}
              onClick={() => handleBeauty(preset)}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all"
              style={{
                background: effectKey === preset.key ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.05)",
                borderColor: effectKey === preset.key ? "rgba(236,72,153,0.7)" : "rgba(255,255,255,0.1)",
              }}
            >
              <span className="text-sm leading-none">{preset.emoji}</span>
              <span className="text-[8px] font-bold" style={{ color: effectKey === preset.key ? "#f9a8d4" : "rgba(255,255,255,0.4)" }}>
                {preset.label}
              </span>
            </button>
          ))}
        </div>
        {effectKey !== "none" && BEAUTY_PRESETS.find(p => p.key === effectKey) && (
          <p className="text-[9px] text-pink-400/70 mt-1">💎 {BEAUTY_PRESETS.find(p => p.key === effectKey)?.label}フィルター適用中</p>
        )}
      </div>

      {/* 映像エフェクト */}
      <div>
        <label className="text-xs text-white/50 mb-1.5 block">🎨 映像エフェクト</label>
        <div className="flex flex-wrap gap-1.5">
          {VIDEO_EFFECTS.map(opt => (
            <button key={opt.key}
              onClick={() => handleEffect(opt)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                effectKey === opt.key
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-white/15 bg-white/5 text-white/60 hover:border-white/30"
              }`}
            >
              <span className="text-base leading-none">{opt.emoji}</span>
              <span className="text-[9px]">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}