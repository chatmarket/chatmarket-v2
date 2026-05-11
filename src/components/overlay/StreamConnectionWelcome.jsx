import React, { useEffect, useState } from "react";

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
        <div
          style={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            pointerEvents: "none",
            animation: "fadeInOut 3s ease-in-out forwards",
          }}
        >
          {/* 赤い強力背景 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle, rgba(239, 68, 68, 0.3) 0%, transparent 70%)",
            }}
          />

          {/* シンプル強力メッセージ */}
          <div
            style={{
              position: "relative",
              zIndex: 10,
              textAlign: "center",
              padding: "40px 60px",
              background: "rgba(0, 0, 0, 0.9)",
              border: "4px solid #ef4444",
              borderRadius: "20px",
              boxShadow: "0 0 60px rgba(239, 68, 68, 0.6)",
            }}
          >
            {/* デカ赤文字 */}
            <div
              style={{
                fontSize: "72px",
                fontWeight: "900",
                color: "#ef4444",
                letterSpacing: "4px",
                textShadow: "0 0 40px rgba(239, 68, 68, 1)",
                marginBottom: "20px",
                lineHeight: "1.1",
              }}
            >
              🚀 接続成功！
            </div>

            {/* サブメッセージ */}
            <div
              style={{
                fontSize: "32px",
                fontWeight: "700",
                color: "#ffffff",
                letterSpacing: "2px",
                marginBottom: "10px",
              }}
            >
              Chat Market
            </div>

            <div
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#fbbf24",
              }}
            >
              配信開始準備完了
            </div>
          </div>

          <style>{`
            @keyframes fadeInOut {
              0% { opacity: 0; }
              10% { opacity: 1; }
              90% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}