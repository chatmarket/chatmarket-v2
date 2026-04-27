import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const confetti = ["🎉", "✨", "💎", "🌟", "⭐", "🎊", "💰", "👑"];

export default function YellCelebrationEffect({ yell, onComplete }) {
  const particles = useRef(Array.from({ length: 12 }, (_, i) => ({
    id: i,
    emoji: confetti[Math.floor(Math.random() * confetti.length)],
    delay: i * 0.05,
    angle: (i / 12) * 360,
    distance: 150,
  }))).current;

  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40">
      {/* 中央フラッシュ */}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute w-20 h-20 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 rounded-full blur-2xl"
      />

      {/* パーティクル爆発 */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
            y: Math.sin((p.angle * Math.PI) / 180) * p.distance - 100,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 1.5, delay: p.delay, ease: "easeOut" }}
          className="absolute text-3xl sm:text-4xl"
        >
          {p.emoji}
        </motion.div>
      ))}

      {/* 中央テキスト */}
      <motion.div
        initial={{ scale: 0, opacity: 1, y: 0 }}
        animate={{ scale: 1.2, opacity: 0, y: -80 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        className="absolute text-center pointer-events-none"
      >
        <p className="text-3xl sm:text-5xl font-black drop-shadow-lg">
          🪙 {yell?.amount}
        </p>
        <p className="text-base sm:text-xl font-bold text-white drop-shadow-md mt-2">
          {yell?.user_name} からのエール！
        </p>
      </motion.div>
    </div>
  );
}