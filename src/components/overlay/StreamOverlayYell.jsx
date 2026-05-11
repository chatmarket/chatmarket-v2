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

  // 🔇 PRISM オーバーレイ向けに音声通知を無効化
  //（音声はメインプレイヤーで処理）

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

      {/* 📣 特大ネオンテキストアラート（社長向け） */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 15 }}
        style={{
          position: "absolute",
          top: "35%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 200,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        {/* 超大型コイン金額（目立つように） */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            textShadow: [
              "0 0 20px #fbbf24, 0 0 40px #f59e0b, 0 0 60px #fbbf24",
              "0 0 40px #fbbf24, 0 0 80px #f59e0b, 0 0 120px #fbbf24",
              "0 0 20px #fbbf24, 0 0 40px #f59e0b, 0 0 60px #fbbf24",
            ],
          }}
          transition={{ duration: 0.8, repeat: Infinity, repeatType: "loop" }}
          style={{
            fontSize: "120px",
            fontWeight: "900",
            color: "#fbbf24",
            letterSpacing: "8px",
            textShadow: "0 0 40px rgba(251, 191, 36, 1), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000",
            WebkitTextStroke: "2px #000",
            paintOrder: "stroke fill",
            lineHeight: "1",
          }}
        >
          {yell.amount}
        </motion.div>

        {/* 「コイン受信！」テキスト */}
        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{
            fontSize: "48px",
            fontWeight: "900",
            color: "#00ff9d",
            letterSpacing: "4px",
            marginTop: "20px",
            textShadow: "0 0 20px #00ff9d, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
            WebkitTextStroke: "1px #000",
            paintOrder: "stroke fill",
          }}
        >
          エール受信！
        </motion.div>
      </motion.div>

      {/* ユーザー名 & メッセージ（下部） */}
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
          top: "70%",
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