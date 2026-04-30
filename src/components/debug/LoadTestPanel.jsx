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
    memoryPeak: 0, // ピークメモリ
    memoryRecovery: 0, // 停止後の復帰率
  });
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const memoryAtStartRef = useRef(0); // ボット開始時のメモリ

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const rafRef = useRef(null);
  const pollingRef = useRef(null);
  const abortControllerRef = useRef(null); // リクエスト中断制御

  // ──────────────────────────────────────────────────────────
  // ログ追加（内部）
  // ──────────────────────────────────────────────────────────
  const addLog = (msg, level = 'info') => {
    setLogs(prev => [...prev.slice(-9), { msg, level, ts: new Date().toLocaleTimeString() }]);
    console.log(`[LoadTest] ${level.toUpperCase()}: ${msg}`);
  };

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
  // メモリ使用量計測（ピーク追跡 + 復帰率計算）
  // ──────────────────────────────────────────────────────────
  const measureMemory = () => {
    if (performance.memory) {
      const used = Math.round(performance.memory.usedJSHeapSize / 1048576); // MB
      
      // ピークメモリ更新
      setMetrics(prev => {
        const newPeak = Math.max(prev.memoryPeak, used);
        
        // ボット停止後の復帰率計算
        let recovery = 0;
        if (memoryAtStartRef.current > 0 && !running) {
          // (現在 - スタート時) / (ピーク - スタート時) × 100
          const current = used;
          const peak = newPeak;
          const baseline = memoryAtStartRef.current;
          const increase = peak - baseline;
          const current_increase = current - baseline;
          recovery = increase > 0 ? Math.max(0, 100 - (current_increase / increase * 100)) : 100;
        }
        
        return {
          ...prev,
          memory: used,
          memoryPeak: newPeak,
          memoryRecovery: recovery,
        };
      });
    }
  };

  // ──────────────────────────────────────────────────────────
  // ネットワーク遅延計測（ping）
  // ──────────────────────────────────────────────────────────
  const measureLag = async () => {
    const start = performance.now();
    try {
      const res = await fetch('/api/ping', {
        method: 'POST',
        body: JSON.stringify({ ts: start }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const lag = Math.round(performance.now() - start);
      setMetrics(prev => ({ ...prev, lag }));
    } catch (err) {
      addLog(`Ping failed: ${err.message}`, 'error');
      setMetrics(prev => ({ ...prev, lag: 9999 }));
    }
  };

  // ──────────────────────────────────────────────────────────
  // ボット状態ポーリング（メトリクス取得）
  // ──────────────────────────────────────────────────────────
  const pollBotStatus = async () => {
    try {
      const res = await fetch('/api/loadTestBot?action=status');
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) {
          setMetrics(prev => ({
            ...prev,
            yellCount: data.metrics.yellsSent || 0,
            msgCount: data.metrics.messagesSent || 0,
          }));
        }
        if (data.metrics?.errors?.length > 0) {
          data.metrics.errors.slice(-3).forEach(err => addLog(err, 'warn'));
        }
      }
    } catch (err) {
      addLog(`Status poll failed: ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    if (!running) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    // FPS計測開始
    rafRef.current = requestAnimationFrame(measureFPS);

    // メモリ計測（1秒ごと）
    const memInterval = setInterval(measureMemory, 1000);

    // ネットワーク遅延計測（2秒ごと）
    const lagInterval = setInterval(measureLag, 2000);

    // ボット状態ポーリング（3秒ごと）
    pollingRef.current = setInterval(pollBotStatus, 3000);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearInterval(memInterval);
      clearInterval(lagInterval);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [running]);

  // ──────────────────────────────────────────────────────────
  // ボット起動
  // ──────────────────────────────────────────────────────────
  const handleStart = async () => {
    // ★ ボット開始時のメモリベースラインを記録
    if (performance.memory) {
      memoryAtStartRef.current = Math.round(performance.memory.usedJSHeapSize / 1048576);
    }
    
    setRunning(true);
    setLogs([]);
    setMetrics(prev => ({ ...prev, memoryPeak: 0, memoryRecovery: 0 })); // リセット
    addLog('Starting load test...', 'info');
    
    // ★ ログ送信ガード：既存ログを即座に /api/track に送信
    if (window.__sendLogs) {
      try {
        let token = '';
        if (window.localStorage && window.localStorage.getItem('auth_token')) {
          token = window.localStorage.getItem('auth_token');
        }
        await window.__sendLogs(token);
        addLog('📤 Pre-test logs sent to /api/track', 'info');
      } catch (e) {
        addLog(`⚠️ Pre-test send failed: ${e.message}`, 'warn');
      }
    }
    
    try {
      const res = await fetch('/api/loadTestBot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_combined',
          stream_id: streamId || 'test_stream',
          duration_seconds: 30,
          user_count: 100,
          mode: 'dummy',
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      addLog(`✅ Bot started: ${data.message}`, 'info');
      addLog(`Mode: ${data.mode} | Users: ${data.users}`, 'info');
      addLog('🔥 100-user bombardment initiated - logging all yells/chats', 'info');
      onStart?.(data);

      // 即座にボット状態ポーリング開始
      pollBotStatus();
    } catch (err) {
      addLog(`❌ Start failed: ${err.message}`, 'error');
      setRunning(false);
    }
  };

  const handleStop = async () => {
    addLog('Stopping load test... (強制中断中)', 'warn');
    setRunning(false); // UI即座に停止表示
    
    // 全ポーリング・計測タイマーを即座に中止
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    // バックエンド停止リクエスト（タイムアウト5秒）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const res = await fetch('/api/loadTestBot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', stream_id: streamId || 'test_stream' }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      addLog(`✅ Bot stopped`, 'info');
      addLog(`Yells: ${data.metrics?.yellsSent || 0} | Messages: ${data.metrics?.messagesSent || 0}`, 'info');
      
      if (data.metrics?.errors?.length > 0) {
        addLog(`Errors: ${data.metrics.errors.length}`, 'warn');
      }

      // ★ テスト完了ログを /api/track に送信（最終検証）
      if (window.__sendLogs) {
        try {
          addLog('📤 Sending bombardment logs to /api/track...', 'info');
          let token = '';
          if (window.localStorage && window.localStorage.getItem('auth_token')) {
            token = window.localStorage.getItem('auth_token');
          }
          await window.__sendLogs(token);
          addLog('✅ Bombardment data successfully logged to /api/track', 'info');
        } catch (e) {
          addLog(`⚠️ Final send failed: ${e.message}`, 'warn');
        }
      }

      onStop?.(data);
    } catch (err) {
      if (err.name === 'AbortError') {
        addLog(`⚠️ Stop timeout（バックエンドが応答しない）- UI側は停止済み`, 'error');
      } else {
        addLog(`❌ Stop failed: ${err.message}`, 'error');
      }
      // UI側は既に停止済みなのでonStopは不要
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
            {metrics.memory} MB {metrics.memoryPeak > 0 && `(peak: ${metrics.memoryPeak} MB)`}
          </motion.span>
        </div>

        {/* メモリ復帰率（停止後） */}
        {!running && metrics.memoryRecovery > 0 && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
            <span className="text-white/60 text-[10px]">Recovery</span>
            <motion.span
              className={`font-bold text-[10px] ${
                metrics.memoryRecovery >= 80 ? 'text-green-400' :
                metrics.memoryRecovery >= 60 ? 'text-yellow-400' :
                'text-red-400'
              }`}
              key={metrics.memoryRecovery}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
            >
              {Math.round(metrics.memoryRecovery)}%
            </motion.span>
          </div>
        )}

        {/* Lag */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/60">LAG</span>
          <motion.span
            className={`font-bold ${
              metrics.lag > 200 ? 'text-red-400' :
              metrics.lag > 100 ? 'text-yellow-400' :
              metrics.lag === 9999 ? 'text-red-500' :
              'text-green-400'
            }`}
            key={metrics.lag}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {metrics.lag === 9999 ? 'Err' : `${metrics.lag} ms`}
          </motion.span>
        </div>

        {/* ボット統計 */}
        {running && (
          <>
            <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
              <span className="text-white/60">💰 Yells</span>
              <motion.span className="font-bold text-yellow-400" key={metrics.yellCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>
                {metrics.yellCount}
              </motion.span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-white/60">💬 Msgs</span>
              <motion.span className="font-bold text-cyan-400" key={metrics.msgCount} initial={{ scale: 1.2 }} animate={{ scale: 1 }}>
                {metrics.msgCount}
              </motion.span>
            </div>
            {/* ★ ログバッファ容量表示（爆撃時の負荷管理） */}
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-white/60">📊 LogBuf</span>
              <span className={`font-bold ${
                window.__logBuffer?.length > 400 ? 'text-red-400' :
                window.__logBuffer?.length > 200 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {window.__logBuffer?.length || 0}/500
              </span>
            </div>
          </>
        )}
      </div>

      {/* ログパネル（ワンクリック展開） */}
      <div className="mb-3 text-[9px] space-y-1 max-h-24 overflow-y-auto bg-black/50 rounded px-2 py-1">
        {logs.length === 0 ? (
          <div className="text-white/30">No logs yet</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`font-mono ${
              log.level === 'error' ? 'text-red-400' :
              log.level === 'warn' ? 'text-yellow-300' :
              'text-white/60'
            }`}>
              <span className="text-white/40">{log.ts}</span> {log.msg}
            </div>
          ))
        )}
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