/**
 * LoadTestPanel
 * 負荷テスト実行中のFPS・メモリ・ネットワーク遅延をリアルタイム表示
 * 開発環境のみで表示
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, X, Zap } from 'lucide-react';

export default function LoadTestPanel({ streamId, onStart, onStop }) {
  const [running, setRunning] = useState(false);
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    lag: 0,
    yellCount: 0,
    msgCount: 0,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef(null);

  // ──────────────────────────────────────────────────────────
  // FPS計測ループ
  // ──────────────────────────────────────────────────────────
  const measureFPS = () => {
    frameCountRef.current++;
    const now = performance.now();
    const elapsed = now - lastTimeRef.current;

    if (elapsed >= 1000) {
      const fps = Math.round(frameCountRef.current * 1000 / elapsed);
      setMetrics(prev => ({ ...prev, fps }));
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }

    rafRef.current = requestAnimationFrame(measureFPS);
  };

  // ──────────────────────────────────────────────────────────
  // メモリ使用量計測
  // ──────────────────────────────────────────────────────────
  const measureMemory = () => {
    if (performance.memory) {
      const used = Math.round(performance.memory.usedJSHeapSize / 1048576); // MB
      setMetrics(prev => ({ ...prev, memory: used }));
    }
  };

  // ──────────────────────────────────────────────────────────
  // ネットワーク遅延計測（ping）
  // ──────────────────────────────────────────────────────────
  const measureLag = async () => {
    const start = performance.now();
    try {
      await fetch('/api/ping', {
        method: 'POST',
        body: JSON.stringify({ ts: start }),
      });
      const lag = Math.round(performance.now() - start);
      setMetrics(prev => ({ ...prev, lag }));
    } catch {}
  };

  useEffect(() => {
    if (!running) return;

    // FPS計測開始
    rafRef.current = requestAnimationFrame(measureFPS);

    // メモリ計測（1秒ごと）
    const memInterval = setInterval(measureMemory, 1000);

    // ネットワーク遅延計測（2秒ごと）
    const lagInterval = setInterval(measureLag, 2000);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearInterval(memInterval);
      clearInterval(lagInterval);
    };
  }, [running]);

  // ──────────────────────────────────────────────────────────
  // ボット起動
  // ──────────────────────────────────────────────────────────
  const handleStart = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/loadTestBot', {
        method: 'POST',
        body: JSON.stringify({
          action: 'start_combined',
          stream_id: streamId,
          duration_seconds: 30,
          user_count: 100,
          mode: 'dummy',
        }),
      });
      const data = await res.json();
      console.log('[LoadTestPanel] Bot started:', data);
      onStart?.(data);
    } catch (err) {
      console.error('[LoadTestPanel] Start failed:', err);
      setRunning(false);
    }
  };

  const handleStop = async () => {
    setRunning(false);
    try {
      const res = await fetch('/api/loadTestBot', {
        method: 'POST',
        body: JSON.stringify({ action: 'stop' }),
      });
      const data = await res.json();
      console.log('[LoadTestPanel] Bot stopped:', data);
      onStop?.(data);
    } catch (err) {
      console.error('[LoadTestPanel] Stop failed:', err);
    }
  };

  // ──────────────────────────────────────────────────────────
  // UI レンダリング
  // ──────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50 bg-black/90 border border-primary/40 rounded-xl p-4 backdrop-blur"
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary">Load Test</span>
        </div>
        <button
          onClick={() => {}}
          className="text-white/30 hover:text-white/70 text-xs"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* メトリクス表示 */}
      <div className="space-y-2 mb-4 text-xs font-mono">
        {/* FPS */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/60">FPS</span>
          <motion.span
            className={`font-bold ${
              metrics.fps < 30 ? 'text-red-400' :
              metrics.fps < 50 ? 'text-yellow-400' :
              'text-green-400'
            }`}
            key={metrics.fps}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {metrics.fps}
          </motion.span>
        </div>

        {/* メモリ */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/60">MEM</span>
          <motion.span
            className={`font-bold ${
              metrics.memory > 300 ? 'text-red-400' :
              metrics.memory > 200 ? 'text-yellow-400' :
              'text-green-400'
            }`}
            key={metrics.memory}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {metrics.memory} MB
          </motion.span>
        </div>

        {/* Lag */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/60">LAG</span>
          <motion.span
            className={`font-bold ${
              metrics.lag > 200 ? 'text-red-400' :
              metrics.lag > 100 ? 'text-yellow-400' :
              'text-green-400'
            }`}
            key={metrics.lag}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {metrics.lag} ms
          </motion.span>
        </div>
      </div>

      {/* ボタン */}
      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={running}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary/20 border border-primary/60 text-primary hover:bg-primary/30 text-xs font-bold transition-all disabled:opacity-40"
        >
          <Play className="w-3 h-3" /> Start
        </button>
        <button
          onClick={handleStop}
          disabled={!running}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/20 border border-red-500/60 text-red-400 hover:bg-red-500/30 text-xs font-bold transition-all disabled:opacity-40"
        >
          <Pause className="w-3 h-3" /> Stop
        </button>
      </div>

      {/* ステータス */}
      {running && (
        <div className="mt-2 text-center">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-[10px] text-primary font-bold"
          >
            ● Running...
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}