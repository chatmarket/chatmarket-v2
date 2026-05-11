/**
 * === LivePreviewLockout ===
 * ライブ配信の30秒無料プレビュー → チケット購入画面
 * タイマー完了後、自動でチケット購入UIに切り替える
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PPV_SETTINGS } from "@/lib/constants";
import { Lock, Clock, Zap } from "lucide-react";

export default function LivePreviewLockout({ stream, user, hasPurchased, onPurchaseClick }) {
  const [secondsLeft, setSecondsLeft] = useState(PPV_SETTINGS.FREE_PREVIEW_SECONDS);
  const [isExpired, setIsExpired] = useState(false);
  const PREVIEW_SECONDS = PPV_SETTINGS.FREE_PREVIEW_SECONDS;

  // 30秒カウントダウン
  useEffect(() => {
    if (hasPurchased || isExpired) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasPurchased, isExpired]);

  // 購入済みまたはチケット制でない場合は表示しない
  if (hasPurchased || !stream?.is_ticket_enabled) return null;

  const progressPercent = ((PREVIEW_SECONDS - secondsLeft) / PREVIEW_SECONDS) * 100;

  return (
    <AnimatePresence>
      {!isExpired ? (
        /* ────────────────────────────────────────────────────────
           【プレビュー中】タイマー表示
           ──────────────────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none"
        >
          {/* タイマーバッジ（左上） */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-4 left-4 z-26 pointer-events-auto"
          >
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-yellow-500/50 rounded-xl px-4 py-2.5 shadow-lg">
              <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
              <span className="text-sm font-black text-yellow-400">
                {secondsLeft}秒
              </span>
              <span className="text-xs text-yellow-300/70">無料プレビュー</span>
            </div>
          </motion.div>

          {/* プログレスバー（底部） */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-1 bg-yellow-500/20"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: PREVIEW_SECONDS, ease: "linear" }}
          />

          {/* 秒数が少なくなったら警告表示 */}
          {secondsLeft <= 10 && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
            >
              <div className="text-center space-y-3">
                <p className="text-white/60 text-sm">
                  チケット購入して全編視聴
                </p>
                <div className="text-4xl font-black text-yellow-400 animate-pulse">
                  {secondsLeft}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      ) : (
        /* ────────────────────────────────────────────────────────
           【タイムアップ】チケット購入モーダル
           ──────────────────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 pointer-events-auto"
        >
          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-yellow-500/40 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl space-y-6"
          >
            {/* ヘッダー */}
            <div className="text-center space-y-3">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="inline-block"
              >
                <div className="w-16 h-16 rounded-2xl bg-yellow-500/15 border border-yellow-500/40 flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8 text-yellow-500" />
                </div>
              </motion.div>
              <h2 className="font-black text-2xl text-white">プレビュー終了</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                チケットを購入して<br />全編をご視聴ください
              </p>
            </div>

            {/* 価格表示 */}
            <div className="bg-black/60 border border-yellow-500/20 rounded-2xl p-4 text-center space-y-1">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">チケット価格</p>
              <p className="text-4xl font-black text-yellow-400">
                ¥{(stream?.ticket_price_yen || 150).toLocaleString()}
              </p>
              <p className="text-xs text-zinc-500">
                {stream?.ticket_duration_minutes || 15}分間視聴可能
              </p>
            </div>

            {/* CTA */}
            {!user ? (
              <button
                onClick={() => {
                  // ログイン後、このページに戻ってくる
                  window.location.href =
                    `/login?next=${encodeURIComponent(window.location.href)}`;
                }}
                className="w-full py-4 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black text-lg rounded-xl transition-all shadow-lg shadow-yellow-500/30 active:scale-95"
              >
                <span className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  ログインして購入
                </span>
              </button>
            ) : (
              <button
                onClick={onPurchaseClick}
                className="w-full py-4 px-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-black text-lg rounded-xl transition-all shadow-lg shadow-yellow-500/30 active:scale-95"
              >
                <span className="flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5" />
                  🎫 チケットを購入する
                </span>
              </button>
            )}

            {/* サブ情報 */}
            <div className="text-center space-y-1">
              <p className="text-[10px] text-zinc-500">
                購入後、すぐに視聴が開始されます
              </p>
              <p className="text-[10px] text-zinc-600">
                決済はStripe（安全な支払い）を使用しています
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}