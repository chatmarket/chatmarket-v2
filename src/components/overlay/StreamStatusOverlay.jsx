import React, { useEffect } from "react";

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
    console.log('[StreamStatusOverlay] 🟢 配信状態更新', {
      isLive,
      viewerCount,
      status,
      isConnecting,
      timestamp: new Date().toISOString(),
    });
    if (isLive) {
      console.log('[StreamStatusOverlay] ✅ LIVE表示（z-index: 999998）');
    }
  }, [isLive, viewerCount, status, isConnecting]);

  // 接続準備中の場合は別表示
  if (isConnecting) {
    console.log('[StreamStatusOverlay] 🔵 接続準備中メッセージ表示（z-index: 999998）');
    return (
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "16px",
          zIndex: 999998,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "rgba(0, 0, 0, 0.9)",
            border: "3px solid #3b82f6",
            borderRadius: "12px",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "700",
            color: "#3b82f6",
            boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)",
            animation: "pulse 1.5s infinite",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#3b82f6",
              animation: "blink 1.5s infinite",
            }}
          />
          接続準備中...
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  if (!isLive) return null;

  return (
    <>
      {/* 右下：LIVE & 視聴者数 */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "16px",
          zIndex: 999998,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "rgba(0, 0, 0, 0.9)",
            border: "3px solid #ef4444",
            borderRadius: "12px",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: "700",
            boxShadow: "0 0 30px rgba(239, 68, 68, 0.6)",
            animation: "liveFlash 1.2s infinite",
          }}
        >
          {/* 点滅 LIVE バッジ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#ef4444",
              letterSpacing: "2px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#ef4444",
                animation: "dotBlink 1.2s infinite",
              }}
            />
            ● LIVE
          </div>

          {/* 視聴者数 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#ffffff",
              borderLeft: "2px solid #ef4444",
              paddingLeft: "12px",
            }}
          >
            <span style={{ fontSize: "14px" }}>👁️</span>
            <span style={{ fontWeight: "900" }}>{viewerCount.toLocaleString()}</span>
          </div>
        </div>
        <style>{`
          @keyframes liveFlash {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
          @keyframes dotBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>

      {/* 左上：配信状態インジケータ */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          left: "16px",
          zIndex: 999998,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 20px rgba(34, 197, 94, 0.8)",
            animation: "pulse 2s infinite",
          }}
        />
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.8; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>

      {/* 視聴者接続状態ログ */}
      <div style={{ display: "none" }}>
        {console.log(`[StreamStatusOverlay] 🟢 Connected: ${viewerCount} viewers`)}
      </div>
    </>
  );
}