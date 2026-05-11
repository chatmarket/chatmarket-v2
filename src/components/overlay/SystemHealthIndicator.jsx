import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * SystemHealthIndicator
 * 左上に常時表示される接続確認看板
 * - API接続状況
 * - WebSocket接続状況
 * - ページロード完了確認
 */
export default function SystemHealthIndicator({ streamId }) {
  const [apiStatus, setApiStatus] = useState("connecting");
  const [wsStatus, setWsStatus] = useState("connecting");
  const [loadedAt, setLoadedAt] = useState(null);

  useEffect(() => {
    // ページロード時刻を記録
    setLoadedAt(new Date().toISOString());
    console.log('[SystemHealthIndicator] 📡 URL loaded at', new Date().toISOString());

    // API接続確認（軽量な呼び出し）
    const checkApi = async () => {
      try {
        await base44.auth.isAuthenticated();
        setApiStatus("connected");
        console.log('[SystemHealthIndicator] ✅ API connected');
      } catch (err) {
        setApiStatus("error");
        console.error('[SystemHealthIndicator] ❌ API error:', err.message);
      }
    };

    checkApi();

    // WebSocket接続確認（購読テスト）
    if (streamId) {
      try {
        const unsubscribe = base44.entities.Comment.subscribe((event) => {
          if (event.type === "create") {
            setWsStatus("connected");
            console.log('[SystemHealthIndicator] ✅ WebSocket connected');
          }
        });

        // 3秒後に未接続判定
        const timer = setTimeout(() => {
          if (wsStatus !== "connected") {
            setWsStatus("waiting");
            console.log('[SystemHealthIndicator] ⏳ WebSocket waiting for data');
          }
        }, 3000);

        return () => {
          clearTimeout(timer);
          unsubscribe();
        };
      } catch (err) {
        setWsStatus("error");
        console.error('[SystemHealthIndicator] ❌ WebSocket error:', err.message);
      }
    }
  }, [streamId]);

  const statusColor = {
    connected: "#22c55e",
    connecting: "#f59e0b",
    waiting: "#3b82f6",
    error: "#ef4444",
  };

  const statusText = {
    connected: "接続済み",
    connecting: "接続中...",
    waiting: "待機中",
    error: "エラー",
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "12px",
        left: "12px",
        zIndex: 999997,
        background: "rgba(0, 0, 0, 0.85)",
        border: "2px solid #666",
        borderRadius: "8px",
        padding: "8px 12px",
        fontSize: "11px",
        color: "#fff",
        fontFamily: "monospace",
        fontWeight: "600",
        boxShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "4px",
          fontSize: "10px",
          color: "#aaa",
          letterSpacing: "1px",
        }}
      >
        ⚙️ SYSTEM
      </div>

      {/* API状態 */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
        <span
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: statusColor[apiStatus],
            animation: apiStatus === "connecting" ? "blink 0.8s infinite" : "none",
          }}
        />
        <span>API: {statusText[apiStatus]}</span>
      </div>

      {/* WebSocket状態 */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
        <span
          style={{
            display: "inline-block",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: statusColor[wsStatus],
            animation: wsStatus === "connecting" ? "blink 0.8s infinite" : "none",
          }}
        />
        <span>WS: {statusText[wsStatus]}</span>
      </div>

      {/* ロード時刻 */}
      {loadedAt && (
        <div style={{ fontSize: "9px", color: "#888", borderTop: "1px solid #444", paddingTop: "4px" }}>
          🕐 {new Date(loadedAt).toLocaleTimeString("ja-JP")}
        </div>
      )}

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}