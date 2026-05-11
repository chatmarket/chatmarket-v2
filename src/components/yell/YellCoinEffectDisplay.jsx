/**
 * === YellCoinEffectDisplay ===
 * 6段階階級制度による演出表示
 * effectLevel に応じた派手さの自動切り替え
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getEffectConfig, isHighValueYell } from "@/lib/YellCoinEffectEngine";

/**
 * 演出レベル別エフェクト表示
 */
export default function YellCoinEffectDisplay({ yell, onComplete }) {
  const { tier, effectLevel, params, isHighValue } = getEffectConfig(yell.amount);

  // 画面シェイク（レベル2、3）
  React.useEffect(() => {
    if (!params.shake) return;

    const intensity = effectLevel === 2 ? 2 : 8;
    let count = 0;
    const shakeInterval = setInterval(() => {
      const x = (Math.random() - 0.5) * intensity;
      const y = (Math.random() - 0.5) * intensity;
      document.documentElement.style.transform = `translate(${x}px, ${y}px)`;
      if (++count >= 6) {
        document.documentElement.style.transform = "translate(0, 0)";
        clearInterval(shakeInterval);
      }
    }, 50);

    return () => {
      clearInterval(shakeInterval);
      document.documentElement.style.transform = "translate(0, 0)";
    };
  }, [effectLevel, params.shake]);

  // 全画面フラッシュ（レベル3のみ）
  const showFullscreenFlash = effectLevel === 3;

  // パーティクル生成
  const particles = Array.from({ length: params.particleCount }).map((_, i) => ({
    id: i,
    angle: (i / params.particleCount) * 360,
    emoji: tier.emoji,
  }));

  return (
    <>
      {/* 全画面フラッシュ（レベル3） */}
      {showFullscreenFlash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.8, 0] }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[9998] bg-white pointer-events-none"
        />
      )}

      {/* メインエフェクト */}
      <motion.div
        initial={{ scale: 0, opacity: 0, y: 100 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.5, opacity: 0, y: -50 }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 12,
          duration: 0.6,
        }}
        onAnimationComplete={onComplete}
        className="fixed top-1/2 left-1/2 z-[9999] -translate-x-1/2 -translate-y-1/2 text-center"
      >
        {/* 背景グロー */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 -m-12"
          style={{
            background: `conic-gradient(from 0deg, ${getTierColor(tier.color)}, transparent)`,
            borderRadius: "50%",
            opacity: 0.4,
            filter: "blur(30px)",
          }}
        />

        {/* メインボックス */}
        <div
          className="relative z-10 rounded-2xl p-8 border-2 backdrop-blur-md"
          style={{
            background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
            borderColor: getTierColor(tier.color),
            boxShadow: `0 0 40px ${getTierColor(tier.color)}80, inset 0 0 20px ${getTierColor(tier.color)}20`,
          }}
        >
          {/* 金額テキスト */}
          <motion.div
            animate={{
              textShadow: [
                `0 0 10px ${getTierColor(tier.color)}`,
                `0 0 30px ${getTierColor(tier.color)}`,
                `0 0 10px ${getTierColor(tier.color)}`,
              ],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-4xl font-black mb-3"
            style={{ color: getTierColor(tier.color) }}
          >
            🎉 {yell.amount.toLocaleString()} コイン 🎉
          </motion.div>

          {/* ユーザー名 */}
          <div className="text-2xl font-black text-white mb-2">{yell.user_name}</div>

          {/* 階級名 */}
          <div className="text-sm font-bold mb-3" style={{ color: getTierColor(tier.color) }}>
            {tier.emoji} {tier.name}
          </div>

          {/* メッセージ */}
          {yell.message && (
            <div className="text-base text-gray-300 italic mt-3 max-w-xs">
              「{yell.message}」
            </div>
          )}

          {/* エフェクトレベル表示 */}
          <div className="mt-3 text-xs text-gray-400">
            演出レベル: {effectLevel} | {effectLevel === 1 ? "軽い" : effectLevel === 2 ? "中程度" : "最高"}
          </div>

          {/* キラキラスター */}
          {[...Array(8)].map((_, i) => (
            <motion.span
              key={i}
              animate={{
                opacity: [0.5, 1, 0.5],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.15,
              }}
              className="absolute text-3xl pointer-events-none"
              style={{
                left: `${50 + Math.cos((i / 8) * Math.PI * 2) * 40}%`,
                top: `${50 + Math.sin((i / 8) * Math.PI * 2) * 40}%`,
                marginLeft: "-1rem",
                marginTop: "-1rem",
              }}
            >
              ✨
            </motion.span>
          ))}
        </div>

        {/* パーティクル */}
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              scale: 0.4,
              x: Math.cos((p.angle * Math.PI) / 180) * (60 + params.scale * 20),
              y: Math.sin((p.angle * Math.PI) / 180) * (60 + params.scale * 20),
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: params.duration / 1000, ease: "easeOut" }}
            className="pointer-events-none absolute text-2xl z-0"
            style={{ left: "50%", top: "50%", marginLeft: "-1rem", marginTop: "-1rem" }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </motion.div>
    </>
  );
}

/**
 * 階級色を取得
 */
function getTierColor(color) {
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