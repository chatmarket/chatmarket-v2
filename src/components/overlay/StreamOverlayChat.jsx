import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * StreamOverlayChat
 * チャットメッセージを下から上へ流すコンポーネント
 * 背景なし、テキストのみ表示
 */
export default function StreamOverlayChat({ messages }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column-reverse",
        overflow: "hidden",
        gap: "8px",
        padding: "16px",
      }}
    >
      <AnimatePresence>
        {messages.map((msg, idx) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "8px",
              fontSize: "14px",
              fontWeight: "500",
              lineHeight: "1.4",
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              pointerEvents: "none",
            }}
          >
            {/* ユーザー名 */}
            <span
              style={{
                color: "#10b981",
                fontWeight: "700",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {msg.user}:
            </span>

            {/* メッセージ本文 */}
            <span
              style={{
                color: "#ffffff",
                wordBreak: "break-word",
                flex: 1,
              }}
            >
              {msg.text}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}