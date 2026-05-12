/**
 * === LivePreviewLockout ===
 * ライブ配信の30秒無料プレビュー → チケット購入画面
 *
 * 不正防止:
 * - localStorage にストリームIDごとの「試聴済み」フラグを保存
 * - リロード後も「30秒お試しは終了しました」を表示
 * - ページを閉じて再アクセスしてもブロック継続
 */

import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { PPV_SETTINGS } from "@/lib/constants";
import { Lock, Clock, Zap, ShieldAlert } from "lucide-react";

const STORAGE_KEY = (streamId) => `preview_used_${streamId}`;

function hasUsedPreview(streamId) {
  try {
    return localStorage.getItem(STORAGE_KEY(streamId)) === "1";
  } catch {
    return false;
  }
}

function markPreviewUsed(streamId) {
  try {
    localStorage.setItem(STORAGE_KEY(streamId), "1");
  } catch {}
}

export default function LivePreviewLockout({ stream, user, hasPurchased, onPurchaseClick }) {
  const PREVIEW_SECONDS = PPV_SETTINGS.FREE_PREVIEW_SECONDS || 30;
  const streamId = stream?.id;

  // リロード後も試聴済みなら即ロック
  const [isExpired, setIsExpired] = useState(() => hasUsedPreview(streamId));
  const [secondsLeft, setSecondsLeft] = useState(
    hasUsedPreview(streamId) ? 0 : PREVIEW_SECONDS
  );
  const timerRef = useRef(null);

  useEffect(() => {
    if (hasPurchased || isExpired || !streamId) return;

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          markPreviewUsed(streamId); // localStorage に記録
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasPurchased, isExpired, streamId]);

  // 購入済みまたはチケット制でない場合は表示しない
  if (hasPurchased || !stream?.is_ticket_enabled) return null;

  const progressPercent = ((PREVIEW_SECONDS - secondsLeft) / PREVIEW_SECONDS) * 100;
  const isWarning = secondsLeft <= 10 && !isExpired;

  return (
    <AnimatePresence>
      {!isExpired ? (
        /* ── プレビュー中 ── */
        <motion.div
          key="preview"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none"
        >
          {/* プログレスバー（底部・目立つ黄色） */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/50 z-30">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-lg shadow-yellow-500/50"
              initial={{ width: "0%" }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: "linear" }}
            />
          </div>

          {/* タイマーバッジ（左上） */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-3 left-3 pointer-events-auto z-30"
          >
            <div className={`flex items-center gap-2 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg border ${isWarning ? "bg-red-900/90 border-red-500/70" : "bg-black/80 border-yellow-500/50"}`}>
              <Clock className={`w-4 h-4 animate-pulse ${isWarning ? "text-red-400" : "text-yellow-400"}`} />
              <span className={`text-sm font-black ${isWarning ? "text-red-300" : "text-yellow-400"}`}>
                {secondsLeft}秒
              </span>
              <span className={`text-xs ${isWarning ? "text-red-300/80" : "text-yellow-300/70"}`}>無料</span>
            </div>
          </motion.div>

          {/* 残り10秒：中央警告 */}
          {isWarning && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-3 z-25"
            >
              <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-6 py-4 text-center space-y-2">
                <p className="text-white/70 text-xs">チケット購入して全編視聴</p>
                <div className="text-6xl font-black text-red-400 animate-pulse leading-none">
                  {secondsLeft}
                </div>
                <p className="text-white/50 text-[10px]">秒でロックされます</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      ) : (
        /* ── タイムアップ / リロード後ロック ── */
        <motion.div
          key="lockout"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto"
        >
          <motion.div
            initial={{ scale: 0.8, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-yellow-500/50 rounded-3xl p-7 max-w-xs w-full mx-4 shadow-2xl shadow-yellow-900/30 space-y-5"
          >
            {/* ヘッダー */}
            <div className="text-center space-y-3">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="inline-block"
              >
                <div className="w-16 h-16 rounded-2xl bg-yellow-500/15 border border-yellow-500/40 flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8 text-yellow-400" />
                </div>
              </motion.div>
              <h2 className="font-black text-xl text-white">
                30秒お試しは終了しました
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                チケットを購入して<br />全編をご視聴ください
              </p>
            </div>

            {/* 不正防止バッジ */}
            <div className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-3 py-2">
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <p className="text-[10px] text-zinc-500">リロードしても再試聴はできません</p>
            </div>

            {/* 価格表示 */}
            <div className="bg-black/60 border border-yellow-500/20 rounded-2xl p-4 text-center space-y-1">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">チケット価格</p>
              <p className="text-4xl font-black text-yellow-400">
                ¥{(stream?.ticket_price_yen || 150).toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-500">
                {stream?.ticket_duration_minutes || 15}分間視聴可能
              </p>
            </div>

            {/* CTA ボタン（デカデカと中央） */}
            {!user ? (
              <button
                onClick={() => base44.auth.redirectToLogin()}
                className="w-full py-4 px-6 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-black text-lg rounded-2xl transition-all shadow-lg shadow-yellow-500/40 active:scale-95 flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                ログインして購入
              </button>
            ) : (
              <button
                onClick={onPurchaseClick}
                className="w-full py-4 px-6 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-black text-lg rounded-2xl transition-all shadow-lg shadow-yellow-500/40 active:scale-95 flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                🎫 今すぐチケットを購入
              </button>
            )}

            <p className="text-center text-[10px] text-zinc-600">
              Stripe（安全な決済）を使用しています
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}