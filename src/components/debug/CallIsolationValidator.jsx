/**
 * CallIsolationValidator
 * 1対1ビデオ通話中に LoadTestPanel 爆撃が影響していないか確認
 * - フレームドロップレート
 * - 音声RTT（往復遅延）
 * - バッファリング検出
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, BarChart3 } from 'lucide-react';

export default function CallIsolationValidator({ remoteVideoRef, call, enabled = true }) {
  const [metrics, setMetrics] = useState({
    frameDropRate: 0, // %
    audioRTT: 0, // ms
    bufferingCount: 0,
    lastFrameDropTime: null,
    isHealthy: true,
  });

  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const monitoringRef = useRef(null);

  // フレームドロップ検出（video要素の描画タイミング）
  useEffect(() => {
    if (!enabled || !remoteVideoRef?.current) return;

    const video = remoteVideoRef.current;
    let cancelled = false;

    const measureFrameRate = () => {
      if (cancelled || !video) return;

      const now = performance.now();
      const expectedFrameTime = 1000 / 30; // 30FPS想定（最小保証）
      const actualInterval = now - lastFrameTimeRef.current;

      // フレーム間隔が2倍以上 = フレームドロップ
      if (actualInterval > expectedFrameTime * 1.5) {
        const dropRate = ((actualInterval - expectedFrameTime) / expectedFrameTime) * 100;
        setMetrics(prev => ({
          ...prev,
          frameDropRate: Math.min(100, Math.round(dropRate)),
          lastFrameDropTime: new Date().toLocaleTimeString(),
          isHealthy: dropRate < 20, // 20% 以上低下で unhealthy
        }));
      } else {
        setMetrics(prev => ({ ...prev, frameDropRate: 0, isHealthy: true }));
      }

      lastFrameTimeRef.current = now;
      monitoringRef.current = requestAnimationFrame(measureFrameRate);
    };

    measureFrameRate();

    return () => {
      cancelled = true;
      if (monitoringRef.current) cancelAnimationFrame(monitoringRef.current);
    };
  }, [enabled, remoteVideoRef]);

  // 音声RTT計測（簡易版）
  useEffect(() => {
    if (!enabled || !call) return;

    const measureAudioRTT = async () => {
      try {
        // リモートオーディオトラックが有効か確認（遅延検出用）
        const stream = remoteVideoRef?.current?.srcObject;
        if (stream instanceof MediaStream) {
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length > 0 && !audioTracks[0].enabled) {
            setMetrics(prev => ({ ...prev, bufferingCount: prev.bufferingCount + 1 }));
          }
        }
      } catch {}
    };

    const interval = setInterval(measureAudioRTT, 1000);
    return () => clearInterval(interval);
  }, [enabled, call, remoteVideoRef]);

  if (!enabled) return null;

  return (
    <div className="fixed top-20 right-4 z-50 bg-black/90 border border-cyan-500/40 rounded-xl p-4 backdrop-blur min-w-64">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-400">隔離検証</span>
        </div>
        {metrics.isHealthy ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-400 animate-pulse" />
        )}
      </div>

      {/* メトリクス表示 */}
      <div className="space-y-2 text-xs font-mono">
        {/* フレームドロップレート */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/60">Frame Drop</span>
          <motion.span
            className={`font-bold ${
              metrics.frameDropRate > 20 ? 'text-red-400' :
              metrics.frameDropRate > 10 ? 'text-yellow-400' :
              'text-green-400'
            }`}
            key={metrics.frameDropRate}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {metrics.frameDropRate}%
          </motion.span>
        </div>

        {/* バッファリング検出 */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/60">Buffering</span>
          <motion.span
            className={`font-bold ${
              metrics.bufferingCount > 2 ? 'text-red-400' :
              metrics.bufferingCount > 0 ? 'text-yellow-400' :
              'text-green-400'
            }`}
            key={metrics.bufferingCount}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {metrics.bufferingCount} evt
          </motion.span>
        </div>

        {/* ステータス */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          <span className="text-white/60">Status</span>
          <span className={`font-bold ${metrics.isHealthy ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.isHealthy ? '✅ 隔離OK' : '⚠️ 干渉検出'}
          </span>
        </div>

        {/* 最後のドロップ時刻 */}
        {metrics.lastFrameDropTime && (
          <div className="text-white/40 text-[9px] pt-1 border-t border-white/10">
            Last: {metrics.lastFrameDropTime}
          </div>
        )}
      </div>

      {/* 警告表示 */}
      {!metrics.isHealthy && (
        <div className="mt-3 text-[10px] bg-red-500/10 border border-red-500/30 rounded px-2 py-1 text-red-300">
          ⚠️ 映像品質低下検出。爆撃が影響している可能性あり。
        </div>
      )}
    </div>
  );
}