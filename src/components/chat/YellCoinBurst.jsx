import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// チャットパネル内でエールコイン送付時に表示する演出（confettiなしの軽量版）
export default function YellCoinBurst({ amount, userName, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  const tier =
    amount >= 10000 ? { bg: "from-red-500 to-orange-500", emoji: "🔥", size: "text-4xl" }
    : amount >= 5000 ? { bg: "from-orange-400 to-yellow-500", emoji: "⭐", size: "text-3xl" }
    : amount >= 1000 ? { bg: "from-yellow-400 to-green-400", emoji: "💛", size: "text-2xl" }
    : { bg: "from-green-400 to-emerald-500", emoji: "💚", size: "text-xl" };

  // コイン飛び出しエフェクト
  const coins = Array.from({ length: Math.min(8, Math.floor(amount / 200)) }, (_, i) => i);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-xl">
      {/* 背景フラッシュ */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-t ${tier.bg} opacity-0`}
        animate={{ opacity: [0, 0.25, 0] }}
        transition={{ duration: 0.6 }}
      />

      {/* 飛び出すコイン */}
      {coins.map((i) => (
        <motion.div
          key={i}
          className="absolute bottom-16 left-1/2 text-yellow-400 text-xl select-none"
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
          animate={{
            x: (i - coins.length / 2) * 30 + Math.sin(i) * 20,
            y: -(80 + i * 15 + Math.random() * 40),
            opacity: [1, 1, 0],
            scale: [0.5, 1.2, 0.8],
          }}
          transition={{ duration: 1.2, delay: i * 0.05, ease: "easeOut" }}
        >
          🪙
        </motion.div>
      ))}

      {/* メインバナー */}
      <motion.div
        className="absolute left-2 right-2 bottom-16"
        initial={{ y: 40, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className={`bg-gradient-to-r ${tier.bg} rounded-xl px-3 py-2.5 shadow-2xl border border-white/20`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={tier.size}>{tier.emoji}</span>
              <div>
                <p className="text-white font-black text-xs leading-none">{userName}</p>
                <p className="text-white/80 text-[10px]">エールコインを送りました！</p>
              </div>
            </div>
            <p className="text-white font-black text-lg">¥{amount.toLocaleString()}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}