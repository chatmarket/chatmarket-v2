import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// 金額に応じたティア設定
function getTier(amount) {
  if (amount >= 5000) return {
    level: "legendary",
    label: "🌟 LEGENDARY TIP!",
    emoji: ["☕", "💰", "🎉", "✨", "🌟", "💎", "🏆", "🔥"],
    bgGradient: "from-yellow-400/40 via-pink-500/30 to-purple-500/40",
    textColor: "text-yellow-300",
    glowColor: "rgba(255,215,0,0.8)",
    particles: 20,
    duration: 4,
  };
  if (amount >= 2000) return {
    level: "gold",
    label: "🏆 GOLD TIP!",
    emoji: ["☕", "💰", "✨", "🎊", "💛"],
    bgGradient: "from-yellow-500/30 via-orange-400/20 to-yellow-600/30",
    textColor: "text-yellow-400",
    glowColor: "rgba(255,180,0,0.6)",
    particles: 14,
    duration: 3.5,
  };
  if (amount >= 500) return {
    level: "silver",
    label: "🥈 SUPER TIP!",
    emoji: ["☕", "🎉", "💫", "⭐"],
    bgGradient: "from-slate-300/20 via-blue-300/15 to-slate-400/20",
    textColor: "text-blue-200",
    glowColor: "rgba(150,200,255,0.5)",
    particles: 8,
    duration: 3,
  };
  return {
    level: "bronze",
    label: "☕ TIP!",
    emoji: ["☕", "💛"],
    bgGradient: "from-amber-700/20 via-yellow-600/15 to-amber-800/20",
    textColor: "text-amber-300",
    glowColor: "rgba(200,140,60,0.4)",
    particles: 5,
    duration: 2.5,
  };
}

function Particle({ emoji, index, total }) {
  const angle = (index / total) * 360;
  const rad = (angle * Math.PI) / 180;
  const dist = 120 + Math.random() * 160;
  const tx = Math.cos(rad) * dist;
  const ty = -Math.abs(Math.sin(rad) * dist) - 80;
  const delay = index * 0.07;

  return (
    <motion.div
      className="absolute text-3xl select-none pointer-events-none"
      style={{ left: "50%", top: "50%", translateX: "-50%", translateY: "-50%" }}
      initial={{ opacity: 1, x: 0, y: 0, scale: 0.5, rotate: 0 }}
      animate={{
        opacity: [1, 1, 0],
        x: tx,
        y: ty,
        scale: [0.5, 1.4, 0.8],
        rotate: angle + 360,
      }}
      transition={{ duration: 1.4, delay, ease: "easeOut" }}
    >
      {emoji}
    </motion.div>
  );
}

export default function TippingAnimation({ amount, userName, onDone }) {
  const tier = getTier(amount);

  useEffect(() => {
    const t = setTimeout(onDone, tier.duration * 1000);
    return () => clearTimeout(t);
  }, []);

  const particles = Array.from({ length: tier.particles }, (_, i) => ({
    emoji: tier.emoji[i % tier.emoji.length],
    index: i,
  }));

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 背景フラッシュ */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-br ${tier.bgGradient}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.6, 0] }}
        transition={{ duration: tier.duration * 0.8, ease: "easeOut" }}
      />

      {/* 中央カード */}
      <motion.div
        className="relative flex flex-col items-center gap-3"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: [0, 1.2, 1], rotate: [0, 5, 0] }}
        transition={{ duration: 0.5, ease: "backOut" }}
      >
        {/* パーティクル */}
        {particles.map((p, i) => (
          <Particle key={i} emoji={p.emoji} index={i} total={tier.particles} />
        ))}

        {/* メインカード */}
        <motion.div
          className="bg-black/70 backdrop-blur-xl rounded-2xl px-8 py-5 border border-white/20 flex flex-col items-center gap-2 shadow-2xl"
          style={{ boxShadow: `0 0 40px ${tier.glowColor}, 0 0 80px ${tier.glowColor}` }}
          animate={tier.level === "legendary" ? {
            boxShadow: [
              `0 0 40px ${tier.glowColor}`,
              `0 0 80px rgba(255,100,200,0.8)`,
              `0 0 60px rgba(100,200,255,0.8)`,
              `0 0 40px ${tier.glowColor}`,
            ],
          } : {}}
          transition={{ duration: 1.5, repeat: tier.level === "legendary" ? 2 : 0 }}
        >
          <motion.div
            className="text-5xl"
            animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1] }}
            transition={{ duration: 0.8, repeat: 1 }}
          >
            ☕
          </motion.div>

          <motion.p
            className={`text-2xl font-black tracking-wider ${tier.textColor}`}
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 0.6, repeat: 2 }}
          >
            {tier.label}
          </motion.p>

          <p className="text-white/80 text-sm font-semibold">
            {userName} さんから
          </p>

          <motion.p
            className="text-3xl font-black text-white"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            ¥{amount.toLocaleString()}
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Legendary: 追加の全画面パーティクル */}
      {tier.level === "legendary" && Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={`extra-${i}`}
          className="absolute text-2xl select-none pointer-events-none"
          style={{
            left: `${Math.random() * 90 + 5}%`,
            top: `${Math.random() * 90 + 5}%`,
          }}
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0.5], y: -120 }}
          transition={{ delay: 0.3 + i * 0.15, duration: 2 }}
        >
          {["🌟", "✨", "💎", "🏆", "💰", "🎊"][i % 6]}
        </motion.div>
      ))}
    </motion.div>
  );
}