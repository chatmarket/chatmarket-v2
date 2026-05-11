import React from "react";

/**
 * ConnectionReadySign
 * 左上に常時表示される『接続確認看板』
 * WebSocket接続前でも「Chat Market システム待機中...」を表示
 */
export default function ConnectionReadySign() {
  return (
    <div
      style={{
        position: "fixed",
        top: "8px",
        left: "8px",
        zIndex: 999996,
        background: "rgba(34, 197, 94, 0.12)",
        border: "2px solid rgba(34, 197, 94, 0.5)",
        borderRadius: "10px",
        padding: "10px 14px",
        backdropFilter: "blur(10px)",
        minWidth: "200px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {/* アニメーション点 */}
        <div
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#22c55e",
            animation: "connectionPulse 1s infinite",
            flexShrink: 0,
          }}
        />

        {/* テキスト */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#22c55e",
              letterSpacing: "1px",
            }}
          >
            Chat Market
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#86efac",
              fontWeight: "600",
            }}
          >
            システム待機中...
          </div>
        </div>
      </div>

      <style>{`
        @keyframes connectionPulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
          }
          50% {
            opacity: 0.5;
            box-shadow: 0 0 2px rgba(34, 197, 94, 0.4);
          }
        }
      `}</style>
    </div>
  );
}