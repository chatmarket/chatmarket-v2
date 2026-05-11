import React, { useEffect, useState } from "react";

/**
 * LightweightYellNotification
 * スマホ最適化版：軽量エール通知
 * 特大テキスト・太い縁取りで確実に視認、アニメーション最小化
 */
export default function LightweightYellNotification({ yell, onComplete }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 999995,
        pointerEvents: "none",
        animation: "fadeInOut 4s ease-in-out forwards",
      }}
    >
      {/* 背景ぼかし */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle, rgba(251, 191, 36, 0.2) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(20px)",
          width: "400px",
          height: "400px",
          margin: "auto",
        }}
      />

      {/* メインテキスト：特大フォント＋太い縁取り */}
      <div
        style={{
          position: "relative",
          textAlign: "center",
          fontWeight: "900",
          fontSize: "64px",
          color: "#fbbf24",
          textShadow: `
            -3px -3px 0 #000,
            3px -3px 0 #000,
            -3px 3px 0 #000,
            3px 3px 0 #000,
            -2px 0 0 #000,
            2px 0 0 #000,
            0 -2px 0 #000,
            0 2px 0 #000,
            0 0 20px rgba(251, 191, 36, 1)
          `,
          letterSpacing: "2px",
          lineHeight: "1.2",
          marginBottom: "16px",
        }}
      >
        ⭐ {(yell?.amount || 0).toLocaleString()}
      </div>

      {/* ユーザー名 */}
      <div
        style={{
          position: "relative",
          textAlign: "center",
          fontSize: "24px",
          fontWeight: "700",
          color: "#fff",
          textShadow: "0 0 10px rgba(251, 191, 36, 0.8), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
          marginBottom: "12px",
        }}
      >
        {yell?.user_name || "視聴者"}
      </div>

      {/* メッセージ（短め） */}
      {yell?.message && (
        <div
          style={{
            position: "relative",
            textAlign: "center",
            fontSize: "14px",
            color: "#fde047",
            background: "rgba(0, 0, 0, 0.6)",
            border: "1px solid rgba(251, 191, 36, 0.5)",
            borderRadius: "8px",
            padding: "8px 12px",
            maxWidth: "280px",
            marginLeft: "auto",
            marginRight: "auto",
            textShadow: "0 0 8px rgba(251, 191, 36, 0.6)",
          }}
        >
          💬 {yell.message}
        </div>
      )}

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}