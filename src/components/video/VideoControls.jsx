import React, { useState, useRef, useEffect } from "react";
import { Settings } from "lucide-react";

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITIES = [
  { label: "自動", value: "auto" },
  { label: "1080p", value: "1080" },
  { label: "720p", value: "720" },
  { label: "480p", value: "480" },
  { label: "360p", value: "360" },
  { label: "240p", value: "240" },
];

export default function VideoControls({ videoRef, showQuality = true }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("speed"); // "speed" | "quality"
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState("auto");
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSpeedChange = (s) => {
    setSpeed(s);
    if (videoRef?.current) videoRef.current.playbackRate = s;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          open ? "bg-primary/20 text-primary" : "bg-secondary hover:bg-secondary/80 text-foreground"
        }`}
        title="再生設定"
      >
        <Settings className="w-3.5 h-3.5" />
        設定
        {speed !== 1 && <span className="text-primary font-bold">×{speed}</span>}
      </button>

      {open && (
        <div className="absolute bottom-10 right-0 z-50 bg-card border border-border rounded-xl shadow-2xl w-52 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border/50">
            <button
              onClick={() => setTab("speed")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                tab === "speed" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              再生速度
            </button>
            {showQuality && (
              <button
                onClick={() => setTab("quality")}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  tab === "quality" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                画質
              </button>
            )}
          </div>

          {/* Speed options */}
          {tab === "speed" && (
            <div className="py-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                    speed === s
                      ? "bg-primary/20 text-primary font-bold"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <span>{s === 1 ? "標準" : `×${s}`}</span>
                  {speed === s && <span className="text-primary text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* Quality options */}
          {tab === "quality" && showQuality && (
            <div className="py-1">
              {QUALITIES.map((q) => (
                <button
                  key={q.value}
                  onClick={() => { setQuality(q.value); setOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                    quality === q.value
                      ? "bg-primary/20 text-primary font-bold"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  <span>{q.label}</span>
                  {quality === q.value && <span className="text-primary text-xs">✓</span>}
                </button>
              ))}
              <p className="text-[10px] text-muted-foreground px-4 pb-2 pt-1">
                ※ 画質は接続環境により自動調整されます
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}