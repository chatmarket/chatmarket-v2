/**
 * LogViewerOverlay - スマホ画面で直接ログを見るパネル
 * 
 * 用途：
 * - vConsole と併用（vConsole がない場合のフォールバック）
 * - 送信されたログの確認
 * - 開発環境でのデバッグ補助
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, Trash2, Copy } from 'lucide-react';

const LogLevelColors = {
  info: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '🔵' },
  warn: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '🟡' },
  error: { bg: 'bg-red-500/20', text: 'text-red-400', icon: '🔴' },
};

export default function LogViewerOverlay({ isDev = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // all | info | warn | error
  const logsEndRef = useRef(null);

  // console をキャプチャ + グローバルバッファに追加
  useEffect(() => {
    if (!isDev) return;

    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const captureLog = (level, args) => {
      const msg = args
        .map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
        .join(' ');

      const logEntry = {
        id: Date.now() + Math.random(),
        ts: new Date().toLocaleTimeString('ja-JP'),
        level,
        msg,
      };

      // UI 更新用
      setLogs(prev => [...prev.slice(-99), logEntry]);

      // グローバルバッファに追加（/api/track 送信用）
      if (window.__logBuffer) {
        window.__logBuffer.push({
          ts: new Date().toISOString(),
          level,
          msg,
        });
        // バッファ溢れ対策
        if (window.__checkBufferCapacity) {
          window.__checkBufferCapacity();
        }
      }
    };

    console.log = function (...args) {
      captureLog('info', args);
      originalLog.apply(console, args);
    };

    console.warn = function (...args) {
      captureLog('warn', args);
      originalWarn.apply(console, args);
    };

    console.error = function (...args) {
      captureLog('error', args);
      originalError.apply(console, args);
    };

    originalLog('[LogViewer] 📊 Initialized with buffer sync');

    // 定期送信（設定間隔ごと）
    const sendInterval = setInterval(async () => {
      if (window.__sendLogs && window.__logBuffer && window.__logBuffer.length > 0) {
        try {
          // 認証トークンを試みて取得
          let token = '';
          if (window.localStorage && window.localStorage.getItem('auth_token')) {
            token = window.localStorage.getItem('auth_token');
          }
          await window.__sendLogs(token);
          // バッファ容量チェック（爆撃時のオーバーフロー防止）
          if (window.__checkBufferCapacity) {
            window.__checkBufferCapacity();
          }
        } catch (e) {
          originalWarn('[LogViewer] Send failed:', e.message);
        }
      }
    }, window.__logConfig?.sendInterval || 5000);

    return () => {
      clearInterval(sendInterval);
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, [isDev]);

  // スクロール自動
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const filteredLogs = logs.filter(l => filter === 'all' || l.level === filter);

  if (!isDev) return null;

  return (
    <>
      {/* ★ 浮動ボタン（右下） */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center hover:bg-primary/30 transition-all"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-lg">📊</span>
        {logs.filter(l => l.level === 'error').length > 0 && (
          <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        )}
      </motion.button>

      {/* ★ ログパネル */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-32 right-4 z-50 w-80 h-96 bg-black/95 border border-primary/40 rounded-xl shadow-2xl flex flex-col backdrop-blur"
          >
            {/* ★ ヘッダー */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <span className="text-xs font-bold text-primary">📊 ログビューア</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/40 hover:text-white/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ★ フィルターボタン */}
            <div className="flex gap-1 px-2 py-1.5 border-b border-white/10 bg-white/5">
              {['all', 'info', 'warn', 'error'].map(level => (
                <button
                  key={level}
                  onClick={() => setFilter(level)}
                  className={`text-[10px] px-2 py-1 rounded transition-all ${
                    filter === level
                      ? 'bg-primary/40 text-primary border border-primary/60'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {level === 'all'
                    ? 'All'
                    : level === 'info'
                    ? 'ℹ️'
                    : level === 'warn'
                    ? '⚠️'
                    : '❌'}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => setLogs([])}
                className="text-white/40 hover:text-white/80 p-1 transition-colors"
                title="Clear logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ★ ログ一覧 */}
            <div className="flex-1 overflow-y-auto space-y-1 p-2 font-mono text-[9px]">
              {filteredLogs.length === 0 ? (
                <div className="text-white/30 text-center pt-8">
                  {logs.length === 0 ? 'ログなし' : 'フィルター結果なし'}
                </div>
              ) : (
                filteredLogs.map(log => {
                  const colors = LogLevelColors[log.level] || LogLevelColors.info;
                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`${colors.bg} ${colors.text} rounded px-2 py-1 border-l-2 border-current`}
                    >
                      <div className="flex items-start gap-1">
                        <span className="shrink-0">{log.ts}</span>
                        <span className="shrink-0">{colors.icon}</span>
                        <span className="truncate">{log.msg.substring(0, 60)}</span>
                      </div>
                      {log.msg.length > 60 && (
                        <div className="text-white/40 ml-12 truncate">
                          {log.msg.substring(60)}
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
              <div ref={logsEndRef} />
            </div>

            {/* ★ フッター（ログ統計） */}
            <div className="px-2 py-1.5 border-t border-white/10 bg-white/5 text-[9px] text-white/60 flex justify-between">
              <span>Total: {logs.length}</span>
              <span>
                {logs.filter(l => l.level === 'error').length} errors
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}