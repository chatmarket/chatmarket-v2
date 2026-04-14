import React from "react";
import { motion, AnimatePresence } from "framer-motion";

// コインに応じたティア設定
const TIERS = [
  { min: 0,     bg: "from-blue-500 to-blue-700",      ring: "border-blue-400",     size: "text-2xl" },
  { min: 300,   bg: "from-purple-500 to-purple-700",   ring: "border-purple-400",   size: "text-3xl" },
  { min: 1000,  bg: "from-orange-500 to-red-600",      ring: "border-orange-400",   size: "text-4xl" },
  { min: 5000,  bg: "from-yellow-400 to-amber-600",    ring: "border-yellow-300",   size: "text-5xl" },
];

function getTier(coins) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (coins >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

function GiftBubble({ gift }) {
  const tier = getTier(gift.amount);
  const emoji = gift.gift_emoji || gift.message?.split(" ")[0] || "🎁";
  const label = gift.gift_label || gift.message || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8, transition: { duration: 0.3 } }}
      transition={{ type: "spring", stiffness: 400, damping: 18 }}
      className="flex items-center gap-2 max-w-[85%]"
    >
      {/* 浮かび上がるスタンプ */}
      <motion.div
        animate={{ rotate: [0, -10, 10, -6, 6, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className={`w-10 h-10 rounded-full bg-gradient-to-br ${tier.bg} border-2 ${tier.ring} flex items-center justify-center shadow-lg shrink-0`}
      >
        <span className={tier.size}>{emoji}</span>
      </motion.div>

      {/* 情報バブル */}
      <div className={`bg-gradient-to-r ${tier.bg} rounded-2xl rounded-bl-sm px-3 py-1.5 shadow-lg`}>
        <p className="text-white font-bold text-xs leading-tight">{gift.sender_name || "匿名"}</p>
        <p className="text-white/90 text-[10px] font-semibold">{label} · {gift.amount.toLocaleString()} コイン</p>
      </div>
    </motion.div>
  );
}

export default function GiftOverlay({ gifts, viewerCount }) {
  return (
    <div className="absolute bottom-16 left-3 pointer-events-none z-30 space-y-2 max-w-[70%]">
      <AnimatePresence mode="popLayout">
        {gifts.map((gift) => (
          <GiftBubble key={gift.id} gift={gift} />
        ))}
      </AnimatePresence>

      {/* 視聴者数に連動したエフェクト: 10人以上でパーティクルを出す */}
      {viewerCount >= 10 && gifts.length > 0 && (
        <AnimatePresence>
          {gifts.slice(-1).map((gift) => (
            <motion.div
              key={`particles-${gift.id}`}
              className="absolute top-0 left-0 pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
            >
              {["✨", "⭐", "💫"].map((p, i) => (
                <motion.span
                  key={i}
                  className="absolute text-sm"
                  initial={{ opacity: 1, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    x: (i - 1) * 40 + Math.random() * 20,
                    y: -60 - i * 15,
                  }}
                  transition={{ duration: 1.2, delay: i * 0.1 }}
                >
                  {p}
                </motion.span>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}