import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ConfettiEffect from "@/components/overlay/ConfettiEffect";

/**
 * StreamOverlayYell
 * スマホ特化版：サイレント・アラート
 * カメラプレビューの邪魔にならないよう、右上コーナーに瞬間表示
 */
export default function StreamOverlayYell({ yell }) {
  const [showConfetti, setShowConfetti] = useState(false); // スマホは負荷削減でコンフェッティ無効

  // 🔇 PRISM オーバーレイ向けに音声通知を無効化
  //（音声はメインプレイヤーで処理）

  return (
    <>
      {/* 📱 スマホ特化版：サイレント・アラート（右上コーナー） */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "fixed",
          top: "20px",
          right: "16px",
          zIndex: 200,
          pointerEvents: "none",
        }}
      >
        {/* 金額 + ユーザー名コンパクト表示 */}
        <div
          style={{
            background: "rgba(0, 0, 0, 0.85)",
            border: "2px solid #fbbf24",
            borderRadius: "12px",
            padding: "12px 16px",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              fontWeight: "900",
              color: "#fbbf24",
              textShadow: "0 0 10px rgba(251, 191, 36, 0.8)",
              lineHeight: "1.1",
            }}
          >
            {yell.amount}
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "#ffffff",
              marginTop: "4px",
              fontWeight: "600",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "120px",
            }}
          >
            {yell.user}
          </div>
        </div>
      </motion.div>




    </>
  );
}