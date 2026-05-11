import React, { useEffect } from "react";
import { motion } from "framer-motion";

/**
 * StreamStatusOverlay
 * 配信状態（LIVE）& リアルタイム視聴者数を表示
 * 右下コーナーの邪魔にならない位置に固定配置
 * 点滅ハートビート効果で「届いている」ことを視覚的に伝達
 * 
 * status: "live" | "connecting" | "scheduled"
 */
export default function StreamStatusOverlay({ isLive, viewerCount = 0, status = "live", isConnecting = false }) {
  useEffect(() => {
    console.log('[StreamStatusOverlay] 📊 Status updated:', { isLive, viewerCount, status, isConnecting });
  }, [isLive, viewerCount, status, isConnecting]);

  // 接続準備中の場合は別表示
  if (isConnecting) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "16px",
          zIndex: 150,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            border: "1.5px solid #3b82f6",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: "700",
          }}
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#3b82f6",
            }}
          />
          <span style={{ color: "#93c5fd" }}>接続準備中...</span>
        </div>
      </motion.div>
    );
  }

  if (!isLive) return null;

  return (
    <>
      {/* 右下：LIVE & 視聴者数 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "16px",
          zIndex: 150,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            border: "1.5px solid #ef4444",
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: "700",
          }}
        >
          {/* 点滅 LIVE バッジ */}
          <motion.div
            animate={{
              opacity: [1, 0.3, 1],
              textShadow: [
                "0 0 8px #ef4444",
                "0 0 2px #ef4444",
                "0 0 8px #ef4444",
              ],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              repeatType: "loop",
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#ef4444",
              fontWeight: "900",
              letterSpacing: "1px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#ef4444",
              }}
            />
            LIVE
          </motion.div>

          {/* 視聴者数 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#ffffff",
              borderLeft: "1px solid rgba(255, 255, 255, 0.2)",
              paddingLeft: "8px",
            }}
          >
            <span style={{ fontSize: "10px" }}>👁️</span>
            <span>{viewerCount.toLocaleString()}</span>
          </div>
        </div>
      </motion.div>

      {/* 左上：配信状態インジケータ（フォールバック） */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          position: "fixed",
          top: "20px",
          left: "16px",
          zIndex: 150,
          pointerEvents: "none",
        }}
      >
        <motion.div
          animate={{
            opacity: [0.6, 1, 0.6],
            boxShadow: [
              "0 0 0 0 rgba(34, 197, 94, 0.4)",
              "0 0 0 8px rgba(34, 197, 94, 0)",
              "0 0 0 0 rgba(34, 197, 94, 0)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "loop",
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 12px rgba(34, 197, 94, 0.6)",
          }}
        />
      </motion.div>

      {/* 視聴者接続状態ログ */}
      <div style={{ display: "none" }}>
        {console.log(`[StreamStatusOverlay] 🟢 Connected: ${viewerCount} viewers`)}
      </div>
    </>
  );
}