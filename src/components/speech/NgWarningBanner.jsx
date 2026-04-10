import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

/**
 * NG発言時の警告バナー（画面上部からスライドイン）
 * Props:
 *   word: string | null   — 検知されたNGワード（null = 非表示）
 *   onClose: () => void   — 閉じる
 *   autoDismissMs?: number — 自動消去までのms（デフォルト4000）
 */
export default function NgWarningBanner({ word, onClose, autoDismissMs = 4000 }) {
  // 自動消去タイマー
  useEffect(() => {
    if (!word) return;
    const timer = setTimeout(onClose, autoDismissMs);
    return () => clearTimeout(timer);
  }, [word, autoDismissMs, onClose]);

  return (
    <AnimatePresence>
      {word && (
        <motion.div
          key="ng-warning-banner"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
        >
          <div className="bg-red-950/95 border border-red-500/60 rounded-2xl px-5 py-4 flex items-start gap-3 shadow-2xl backdrop-blur-xl">
            {/* アイコン（点滅） */}
            <div className="shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
            </div>

            {/* メッセージ */}
            <div className="flex-1 min-w-0">
              <p className="text-red-200 font-bold text-sm leading-tight">
                ⚠️ NGワードを検知しました
              </p>
              <p className="text-red-300/70 text-xs mt-0.5 truncate">
                検知ワード：
                <span className="font-mono font-bold text-red-300">
                  「{word}」
                </span>
              </p>
            </div>

            {/* 閉じるボタン */}
            <button
              onClick={onClose}
              className="shrink-0 text-red-400/60 hover:text-red-300 transition-colors mt-0.5"
              aria-label="閉じる"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* プログレスバー（自動消去タイマー表示） */}
          <motion.div
            className="h-0.5 bg-red-500/60 rounded-full mt-1.5 mx-4"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: autoDismissMs / 1000, ease: "linear" }}
            style={{ transformOrigin: "left" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}