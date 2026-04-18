import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function LiveTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const update = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const fmt = (n) => String(n).padStart(2, "0");
  const label = h > 0 ? `${fmt(h)}:${fmt(m)}:${fmt(s)}` : `${fmt(m)}:${fmt(s)}`;

  return (
    <span className="flex items-center gap-1.5 bg-black/70 text-white font-mono font-bold px-3 py-1 rounded-full text-sm">
      <Clock className="w-3.5 h-3.5 text-red-400" />
      {label}
    </span>
  );
}