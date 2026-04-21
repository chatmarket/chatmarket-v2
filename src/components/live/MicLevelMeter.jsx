import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

/**
 * Web Audio API のみを使ったマイクレベルメーター
 * IVS・WebRTC等の配信ロジックと完全に独立
 */
export default function MicLevelMeter({ micOn }) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    if (!micOn) {
      setLevel(0);
      return;
    }

    let alive = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const buf = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (!alive) return;
          analyser.getByteFrequencyData(buf);
          const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
          setLevel(Math.min(100, Math.round((avg / 128) * 100)));
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // マイク取得失敗は無視（メイン機能に影響しない）
      }
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
      analyserRef.current = null;
      streamRef.current = null;
      audioCtxRef.current = null;
    };
  }, [micOn]);

  const bars = 12;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/10">
      {micOn
        ? <Mic className="w-3.5 h-3.5 text-green-400 shrink-0" />
        : <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
      }
      <div className="flex items-end gap-0.5 h-4">
        {Array.from({ length: bars }).map((_, i) => {
          const threshold = ((i + 1) / bars) * 100;
          const active = micOn && level >= threshold;
          const color = i < bars * 0.5
            ? "bg-green-400"
            : i < bars * 0.8
            ? "bg-yellow-400"
            : "bg-red-400";
          return (
            <div
              key={i}
              className={`w-1 rounded-sm transition-all duration-75 ${active ? color : "bg-white/15"}`}
              style={{ height: `${40 + (i / bars) * 60}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}