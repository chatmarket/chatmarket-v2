/**
 * === FeaturedYellPanel ===
 * 5000コイン以上のエール自動ピン留め機能
 * 画面上部に固定表示（Featured Comment）
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getYellTierFromCoins } from "@/lib/constants";
import { isHighValueYell } from "@/lib/YellCoinEffectEngine";
import { X, Pin } from "lucide-react";

/**
 * ハイバリューエール（5000+）を画面上部に固定表示
 * - 自動的に「ピン留めコメント」として表示
 * - 最新1件のみ表示
 * - 6秒後に自動消滅（またはクローズボタン）
 */
export default function FeaturedYellPanel({ yell, onClose }) {
  const tier = getYellTierFromCoins(yell.amount);
  const isFeatured = isHighValueYell(yell.amount);

  // 6秒後に自動消滅
  React.useEffect(() => {
    if (!isFeatured) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [isFeatured, onClose]);

  if (!isFeatured) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -30 }}
        transition={{ duration: 0.3 }}
        className="fixed top-4 left-1/2 z-[9997] -translate-x-1/2 w-full max-w-2xl px-4"
      >
        <div
          className="rounded-xl border-2 p-4 backdrop-blur-md shadow-2xl"
          style={{
            background: `linear-gradient(135deg, ${getTierBgColor(tier.color)}20 0%, ${getTierBgColor(tier.color)}05 100%)`,
            borderColor: getTierBgColor(tier.color),
          }}
        >
          {/* ピンアイコン + タイトル */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pin className="w-5 h-5" style={{ color: getTierBgColor(tier.color) }} />
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: getTierBgColor(tier.color) }}>
                Featured Comment
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* コンテンツ */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl">{tier.emoji}</span>
              <span className="text-white font-black text-lg">{yell.user_name}</span>
              <span className="text-xs font-bold" style={{ color: getTierBgColor(tier.color) }}>
                {tier.name}
              </span>
              <span className="text-white font-black text-lg ml-auto">
                {yell.amount.toLocaleString()} コイン
              </span>
            </div>

            {yell.message && (
              <div className="text-gray-300 italic pl-8">「{yell.message}」</div>
            )}
          </div>

          {/* プログレスバー（6秒） */}
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 6, ease: "linear" }}
            className="mt-3 h-1 rounded-full"
            style={{ background: getTierBgColor(tier.color) }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * 階級別背景色
 */
function getTierBgColor(color) {
  const colorMap = {
    yellow: "#fbbf24",
    orange: "#fb923c",
    red: "#ef4444",
    purple: "#a855f7",
    gold: "#fcd34d",
    diamond: "#00d4ff",
  };
  return colorMap[color] || "#fbbf24";
}