/**
 * CallSettingsPanel — 通話画面の設定パネル（デバイス選択 + 映像エフェクト）
 */
import React from "react";

const VIDEO_EFFECTS = [
  { key: "none",    label: "なし",   emoji: "⬜", filter: "" },
  { key: "vivid",   label: "鮮やか", emoji: "🎨", filter: "saturate(1.8) contrast(1.1)" },
  { key: "cool",    label: "クール", emoji: "❄️", filter: "hue-rotate(200deg) saturate(1.4)" },
  { key: "warm",    label: "暖色",   emoji: "🌅", filter: "sepia(0.4) saturate(1.5) brightness(1.05)" },
  { key: "bw",      label: "モノクロ",emoji: "🎞️", filter: "grayscale(1)" },
  { key: "vintage", label: "レトロ", emoji: "📷", filter: "sepia(0.6) contrast(1.1) brightness(0.9)" },
  { key: "dream",   label: "夢幻",   emoji: "✨", filter: "blur(0.5px) saturate(1.3) brightness(1.1)" },
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
      {/* 映像エフェクト */}
      <div>
        <label className="text-xs text-white/50 mb-1.5 block">✨ 映像エフェクト</label>
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