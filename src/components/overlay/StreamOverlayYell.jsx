import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ConfettiEffect from "@/components/overlay/ConfettiEffect";

/**
 * StreamOverlayYell
 * エール（投げ銭）の派手なエフェクト表示
 * 画面中央にキラキラアニメーション付きで出現
 */
export default function StreamOverlayYell({ yell }) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // 読み上げ機能（あれば）
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(
        `${yell.user}さんから${yell.amount}コイン！`
      );
      utterance.lang = "ja-JP";
      utterance.rate = 1.2;
      window.speechSynthesis.speak(utterance);
    }
  }, [yell]);

  return (
    <>
      {/* 背景フラッシュ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.15, 0] }}
        transition={{ duration: 0.6 }}
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle, #fbbf24 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 50,
        }}
      />

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
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 100,
          textAlign: "center",
        }}
      >
        {/* キラキラ背景 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            inset: "-40px",
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, #fbbf24, #f59e0b, #fbbf24)",
            opacity: 0.3,
            filter: "blur(20px)",
          }}
        />

        {/* テキストコンテナ */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "30px 60px",
            background: "linear-gradient(135deg, #1f2937 0%, #111827 100%)",
            border: "3px solid #fbbf24",
            borderRadius: "20px",
            boxShadow: "0 0 40px rgba(251, 191, 36, 0.6), inset 0 0 20px rgba(251, 191, 36, 0.1)",
          }}
        >
          {/* メインテキスト */}
          <motion.div
            animate={{ textShadow: ["0 0 10px #fbbf24", "0 0 30px #fbbf24", "0 0 10px #fbbf24"] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              fontSize: "32px",
              fontWeight: "900",
              color: "#fbbf24",
              letterSpacing: "2px",
              marginBottom: "12px",
              textShadow: "0 0 20px rgba(251, 191, 36, 0.8)",
            }}
          >
            🎉 {yell.amount} コイン! 🎉
          </motion.div>

          {/* ユーザー名 */}
          <div
            style={{
              fontSize: "20px",
              fontWeight: "700",
              color: "#ffffff",
              marginBottom: "8px",
            }}
          >
            {yell.user}
          </div>

          {/* メッセージ */}
          {yell.message && (
            <div
              style={{
                fontSize: "14px",
                color: "#d1d5db",
                fontStyle: "italic",
                marginTop: "12px",
              }}
            >
              「{yell.message}」
            </div>
          )}

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
              style={{
                position: "absolute",
                fontSize: "24px",
                pointerEvents: "none",
              }}
            >
              ✨
            </motion.span>
          ))}
        </div>
      </motion.div>

      {/* コンフェッティ */}
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}
    </>
  );
}