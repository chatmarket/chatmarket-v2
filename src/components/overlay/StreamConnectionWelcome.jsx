import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * StreamConnectionWelcome
 * Prism Web Overlay ロード時の接続成功メッセージ
 * 3秒間で完結：フェードイン → 表示 → フェードアウト
 */
export default function StreamConnectionWelcome({ streamId }) {
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // 🔥 即座に強制表示（WebSocket待たない）
    console.log('%c[StreamConnectionWelcome] 🚀 STATIC OVERLAY LOADED NOW', 'color: #10b981; font-weight: bold; font-size: 16px');
    console.log('[StreamConnectionWelcome] ⏰ Time:', new Date().toISOString());
    console.log('[StreamConnectionWelcome] 📡 Stream ID:', streamId);
    console.log('[StreamConnectionWelcome] 🎨 z-index: 999999 (always on top)');

    // 3秒後に自動で非表示
    const timer = setTimeout(() => {
      setShowWelcome(false);
      console.log('[StreamConnectionWelcome] ✅ Fading out after 3 seconds');
    }, 3000);

    return () => clearTimeout(timer);
  }, [streamId]);

  return (
    <>
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeIn" }}
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            pointerEvents: "none",
          }}
        >
          {/* グラデーション背景フェード */}
          <motion.div
            animate={{ opacity: [0, 0.1, 0] }}
            transition={{ duration: 3, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)",
            }}
          />

          {/* メインテキスト */}
          <motion.div
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.8, 1, 1, 0.95],
            }}
            transition={{
              duration: 3,
              times: [0, 0.15, 0.85, 1],
              ease: "easeInOut",
            }}
            style={{
              position: "relative",
              zIndex: 10,
              textAlign: "center",
            }}
          >
            {/* 外枠グロー */}
            <motion.div
              animate={{
                opacity: [0, 0.3, 0.3, 0],
                boxShadow: [
                  "0 0 0 0 rgba(34, 197, 94, 0.4)",
                  "0 0 40px 20px rgba(34, 197, 94, 0.3)",
                  "0 0 40px 20px rgba(34, 197, 94, 0.2)",
                  "0 0 0 0 rgba(34, 197, 94, 0)",
                ],
              }}
              transition={{
                duration: 3,
                times: [0, 0.2, 0.8, 1],
              }}
              style={{
                position: "absolute",
                inset: "-40px",
                borderRadius: "20px",
                zIndex: -1,
              }}
            />

            {/* メインメッセージ + テスト用背景色 */}
            <div
              style={{
                fontSize: "56px",
                fontWeight: "900",
                color: "#ffffff",
                letterSpacing: "2px",
                textShadow: "0 0 30px rgba(34, 197, 94, 0.8), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000",
                WebkitTextStroke: "1.5px #000",
                paintOrder: "stroke fill",
                lineHeight: "1.2",
                marginBottom: "16px",
                padding: "20px 30px",
                backgroundColor: "rgba(34, 197, 94, 0.15)",
                borderRadius: "16px",
                backdropFilter: "blur(8px)",
              }}
            >
              🎉 Chat Market
              <br />
              接続成功！
            </div>

            {/* サブメッセージ + テスト用背景色 */}
            <div
              style={{
                fontSize: "28px",
                fontWeight: "700",
                color: "#22c55e",
                letterSpacing: "1px",
                textShadow: "0 0 20px rgba(34, 197, 94, 0.8), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
                WebkitTextStroke: "1px #000",
                paintOrder: "stroke fill",
                padding: "12px 20px",
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                borderRadius: "12px",
              }}
            >
              今日も最高の配信を！
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}