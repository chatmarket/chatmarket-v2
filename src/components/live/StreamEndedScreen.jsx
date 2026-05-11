import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { ThumbsUp, Heart } from "lucide-react";

/**
 * StreamEndedScreen
 * 配信終了画面：視聴者向け
 * 「配信は終了しました。エールありがとうございました！」
 */
export default function StreamEndedScreen({ totalYells = 0, totalViewers = 0 }) {
  useEffect(() => {
    console.log('[StreamEndedScreen] 👋 Stream ended display triggered');
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div style={{ textAlign: "center", position: "relative", zIndex: 10 }}>
        {/* アニメーションバックグラウンド */}
        <motion.div
          animate={{
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
          style={{
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background: "radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)",
            zIndex: -1,
          }}
        />

        {/* メインメッセージ */}
        <motion.div
          animate={{
            scale: [0.95, 1, 0.98],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              fontWeight: "900",
              color: "#ffffff",
              marginBottom: "16px",
              textShadow: "0 0 20px rgba(34, 197, 94, 0.6)",
            }}
          >
            👋 配信終了
          </div>

          <div
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#22c55e",
              marginBottom: "32px",
              letterSpacing: "1px",
              textShadow: "0 0 15px rgba(34, 197, 94, 0.5)",
            }}
          >
            エールありがとうございました！
          </div>
        </motion.div>

        {/* 統計情報 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          style={{
            display: "flex",
            gap: "32px",
            justifyContent: "center",
            marginTop: "32px",
            flexWrap: "wrap",
          }}
        >
          {/* 視聴者数 */}
          <div
            style={{
              background: "rgba(34, 197, 94, 0.1)",
              border: "1.5px solid rgba(34, 197, 94, 0.4)",
              borderRadius: "12px",
              padding: "16px 24px",
              minWidth: "160px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                justifyContent: "center",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "24px" }}>👁️</span>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: "900",
                  color: "#22c55e",
                }}
              >
                {totalViewers}
              </span>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#86efac",
                fontWeight: "600",
              }}
            >
              視聴者
            </div>
          </div>

          {/* エール数 */}
          <div
            style={{
              background: "rgba(251, 191, 36, 0.1)",
              border: "1.5px solid rgba(251, 191, 36, 0.4)",
              borderRadius: "12px",
              padding: "16px 24px",
              minWidth: "160px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                justifyContent: "center",
                marginBottom: "8px",
              }}
            >
              <span style={{ fontSize: "24px" }}>⭐</span>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: "900",
                  color: "#fbbf24",
                }}
              >
                {totalYells}
              </span>
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#fde047",
                fontWeight: "600",
              }}
            >
              エール受信
            </div>
          </div>
        </motion.div>

        {/* フッターメッセージ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          style={{
            marginTop: "40px",
            fontSize: "14px",
            color: "#94a3b8",
          }}
        >
          また次回の配信でお会いしましょう！
          <br />
          <span style={{ fontSize: "12px", marginTop: "8px", display: "block" }}>
            📲 ホームに戻ります...
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}