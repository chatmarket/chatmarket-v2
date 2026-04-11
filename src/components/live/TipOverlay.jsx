import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const GIFT_TIERS = [
  { min: 0,    max: 499,   emoji: "🎁", color: "from-blue-500 to-blue-700",    size: "text-sm"  },
  { min: 500,  max: 999,   emoji: "💎", color: "from-purple-500 to-purple-700", size: "text-base" },
  { min: 1000, max: 4999,  emoji: "🔥", color: "from-orange-500 to-red-600",   size: "text-lg"  },
  { min: 5000, max: Infinity, emoji: "👑", color: "from-yellow-400 to-amber-600", size: "text-xl" },
];

function getTier(amount) {
  return GIFT_TIERS.find(t => amount >= t.min && amount <= t.max) || GIFT_TIERS[0];
}

export default function TipOverlay({ tips }) {
  return (
    <div className="absolute bottom-16 left-3 right-3 pointer-events-none z-30 flex flex-col gap-2 items-start">
      <AnimatePresence>
        {tips.map((tip) => {
          const tier = getTier(tip.amount);
          return (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, x: -60, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`bg-gradient-to-r ${tier.color} rounded-full px-4 py-2 shadow-lg flex items-center gap-2 max-w-[80%]`}
            >
              <span className={tier.size}>{tier.emoji}</span>
              <div className="text-white">
                <span className="font-bold text-xs">{tip.sender_name || "匿名"}</span>
                <span className="text-xs opacity-80 mx-1">·</span>
                <span className="font-black text-xs">{tip.amount.toLocaleString()} コイン</span>
              </div>
              {tip.message && (
                <span className="text-white/90 text-xs truncate max-w-[120px]">「{tip.message}」</span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}