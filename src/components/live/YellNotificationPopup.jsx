/**
 * YellNotificationPopup
 * エールが来たら画面上部に大きくポップアップ表示
 * SuperChatエンティティをリアルタイムSubscribeして通知
 */
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

const DISPLAY_MS = 4500;

function getTierStyle(coins) {
  if (coins >= 500) return {
    bg: "linear-gradient(135deg, #7c2d12, #dc2626, #fbbf24)",
    border: "#fbbf24",
    glow: "0 0 40px 12px rgba(251,191,36,0.7)",
    emoji: "👑",
    label: "大エール！",
    textColor: "#fff",
  };
  if (coins >= 100) return {
    bg: "linear-gradient(135deg, #7c3aed, #f97316)",
    border: "#f97316",
    glow: "0 0 30px 8px rgba(249,115,22,0.6)",
    emoji: "🔥",
    label: "エール！",
    textColor: "#fff",
  };
  if (coins >= 50) return {
    bg: "linear-gradient(135deg, #d97706, #fbbf24)",
    border: "#fbbf24",
    glow: "0 0 20px 6px rgba(251,191,36,0.5)",
    emoji: "💛",
    label: "エール",
    textColor: "#000",
  };
  return {
    bg: "linear-gradient(135deg, #065f46, #10b981)",
    border: "#10b981",
    glow: "0 0 16px 4px rgba(16,185,129,0.4)",
    emoji: "🪙",
    label: "エール",
    textColor: "#fff",
  };
}

// Web Speech API 読み上げ
function speak(text) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "ja-JP";
    utt.rate = 1.1;
    utt.pitch = 1.1;
    utt.volume = 1.0;
    window.speechSynthesis.speak(utt);
  } catch (_) {}
}

export default function YellNotificationPopup({ streamId, speechEnabled }) {
  const [notifications, setNotifications] = useState([]);
  const seenRef = useRef(new Set());

  useEffect(() => {
    if (!streamId) return;

    const unsub = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create") return;
      const data = event.data;
      if (!data || data.livestream_id !== streamId) return;
      if (seenRef.current.has(event.id)) return;
      seenRef.current.add(event.id);

      const notif = {
        id: event.id,
        userName: data.user_name || "匿名",
        coins: data.amount || 0,
        message: data.message || "",
      };

      setNotifications((prev) => [...prev.slice(-2), notif]);

      // 読み上げ
      if (speechEnabled) {
        const tier = getTierStyle(notif.coins);
        speak(`${notif.coins}エール、${notif.userName}さんありがとうございます！`);
      }

      // 自動消去
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
      }, DISPLAY_MS);
    });

    return () => unsub();
  }, [streamId, speechEnabled]);

  return (
    <div
      className="pointer-events-none"
      style={{
        position: "absolute",
        top: 56,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9000,
        width: "min(92vw, 420px)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <AnimatePresence>
        {notifications.map((n) => {
          const tier = getTierStyle(n.coins);
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -40, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              style={{
                background: tier.bg,
                border: `2px solid ${tier.border}`,
                boxShadow: tier.glow,
                borderRadius: 18,
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              {/* 絵文字アイコン */}
              <motion.span
                animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6 }}
                style={{ fontSize: 36, lineHeight: 1 }}
              >
                {tier.emoji}
              </motion.span>

              {/* テキスト */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  color: tier.textColor,
                  fontWeight: 900,
                  fontSize: 20,
                  lineHeight: 1.2,
                  textShadow: "0 1px 4px rgba(0,0,0,0.4)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}>
                  {n.userName}さんが
                  <span style={{ fontSize: 26, margin: "0 4px" }}>{n.coins}</span>
                  {tier.label}！
                </p>
                {n.message && (
                  <p style={{
                    color: tier.textColor,
                    opacity: 0.85,
                    fontSize: 13,
                    marginTop: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    「{n.message}」
                  </p>
                )}
              </div>

              {/* コイン数バッジ */}
              <div style={{
                background: "rgba(0,0,0,0.35)",
                borderRadius: 12,
                padding: "6px 12px",
                textAlign: "center",
                flexShrink: 0,
              }}>
                <p style={{ color: "#fbbf24", fontWeight: 900, fontSize: 22, lineHeight: 1 }}>{n.coins}</p>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700 }}>コイン</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}