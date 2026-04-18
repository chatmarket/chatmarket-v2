import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";

const MAX_POINTS = 30; // 表示する最大ポイント数

export default function ViewerCountGraph({ streamId, isLive }) {
  const [history, setHistory] = useState([]); // [{time, count}]
  const [sparkEffect, setSparkEffect] = useState(false);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!isLive || !streamId) return;

    const fetchCount = async () => {
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      const count = streams[0]?.viewer_count || 0;
      const now = Date.now();

      setHistory(prev => {
        const next = [...prev, { time: now, count }].slice(-MAX_POINTS);
        return next;
      });

      // 人が増えた瞬間にキラキラ
      if (count > prevCountRef.current && prevCountRef.current > 0) {
        setSparkEffect(true);
        setTimeout(() => setSparkEffect(false), 2000);
      }
      prevCountRef.current = count;
    };

    fetchCount();
    const interval = setInterval(fetchCount, 10000);
    return () => clearInterval(interval);
  }, [streamId, isLive]);

  if (!isLive || history.length < 2) return null;

  const currentCount = history[history.length - 1]?.count ?? 0;
  const maxCount = Math.max(...history.map(h => h.count), 1);
  const minCount = Math.min(...history.map(h => h.count), 0);
  const range = maxCount - minCount || 1;

  // SVGパスを生成
  const W = 200, H = 50;
  const points = history.map((h, i) => {
    const x = (i / (MAX_POINTS - 1)) * W;
    const y = H - ((h.count - minCount) / range) * (H - 8) - 4;
    return `${x},${y}`;
  });
  const pathD = `M ${points.join(" L ")}`;

  return (
    <div className="relative bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-4 py-3 space-y-2">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-white">視聴者数グラフ</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AnimatePresence>
            {sparkEffect && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="flex items-center gap-1 text-yellow-400 text-xs font-black"
              >
                <Sparkles className="w-4 h-4" />
                増えた！
              </motion.div>
            )}
          </AnimatePresence>
          <span className={`text-lg font-black transition-colors ${sparkEffect ? "text-yellow-400" : "text-white"}`}>
            {currentCount.toLocaleString()}
          </span>
          <span className="text-xs text-zinc-400">人</span>
        </div>
      </div>

      {/* グラフ */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 50 }}>
        {/* グラデーション塗りつぶし */}
        <defs>
          <linearGradient id="viewerGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ff9d" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00ff9d" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${pathD} L ${W},${H} L 0,${H} Z`}
          fill="url(#viewerGrad)"
        />
        <path
          d={pathD}
          fill="none"
          stroke={sparkEffect ? "#facc15" : "#00ff9d"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "stroke 0.5s" }}
        />
        {/* 最新点 */}
        <circle
          cx={(history.length - 1) / (MAX_POINTS - 1) * W}
          cy={H - ((currentCount - minCount) / range) * (H - 8) - 4}
          r="4"
          fill={sparkEffect ? "#facc15" : "#00ff9d"}
          className={sparkEffect ? "animate-ping" : ""}
        />
      </svg>

      {/* キラキラエフェクト背景 */}
      <AnimatePresence>
        {sparkEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ boxShadow: "0 0 20px rgba(250,204,21,0.4)", border: "1px solid rgba(250,204,21,0.5)" }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}