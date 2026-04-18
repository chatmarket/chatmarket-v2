import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

// 15分刻みの節目秒数
const MILESTONES_SEC = [15*60, 30*60, 45*60, 60*60, 75*60, 90*60, 105*60, 120*60];

export default function LiveTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    let prevElapsed = 0;
    const update = () => {
      const e = Math.floor((Date.now() - start) / 1000);
      setElapsed(e);
      // 15分節目に到達した瞬間だけパルスを出す
      const hitMilestone = MILESTONES_SEC.some(m => e >= m && prevElapsed < m);
      if (hitMilestone) {
        setPulse(true);
        setTimeout(() => setPulse(false), 3000);
      }
      prevElapsed = e;
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const fmt = (n) => String(n).padStart(2, "0");
  const label = h > 0 ? `${fmt(h)}:${fmt(m)}:${fmt(s)}` : `${fmt(m)}:${fmt(s)}`;

  // 節目まで残り60秒以内かどうか（次の節目への警告色）
  const nextMilestone = MILESTONES_SEC.find(m => m > elapsed);
  const nearMilestone = nextMilestone && (nextMilestone - elapsed) <= 60;

  return (
    <span
      className={`flex items-center gap-1.5 font-mono font-bold px-3 py-1 rounded-full text-sm transition-all duration-500 ${
        pulse
          ? "bg-yellow-400 text-black scale-110 shadow-lg shadow-yellow-400/50"
          : nearMilestone
          ? "bg-orange-500/80 text-white animate-pulse"
          : "bg-black/70 text-white"
      }`}
    >
      <Clock className={`w-3.5 h-3.5 ${pulse ? "text-black" : "text-red-400"}`} />
      {label}
      {pulse && <span className="text-[10px] font-black ml-1">✓ 15分！</span>}
      {nearMilestone && !pulse && (
        <span className="text-[10px] font-black ml-1">
          あと{nextMilestone - elapsed}秒
        </span>
      )}
    </span>
  );
}