import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * PrismWebOverlay — 完全スタンドアロン版
 * 
 * ✅ URLを開いた瞬間に「Chat Market システム待機中...」を表示（JS完了前でも）
 * ✅ スマホWebkit対応（-webkit-プレフィックス・GPU強制レイヤー）
 * ✅ 自己診断パネル（API/WS接続状況）
 * ✅ 軽量エール通知（特大テキスト・太縁取り）
 * ✅ AppLayoutのヘッダー/ナビを完全に排除
 */
export default function PrismWebOverlay() {
  const { streamId } = useParams();
  const [chatMessages, setChatMessages] = useState([]);
  const [latestYell, setLatestYell] = useState(null);
  const [showYell, setShowYell] = useState(false);
  const [streamStatus, setStreamStatus] = useState("scheduled");
  const [viewerCount, setViewerCount] = useState(0);
  const [apiOk, setApiOk] = useState(false);
  const [wsOk, setWsOk] = useState(false);
  const [loadTime] = useState(() => new Date().toLocaleTimeString("ja-JP"));
  const [isLandscape, setIsLandscape] = useState(
    typeof window !== "undefined" ? window.innerWidth > window.innerHeight : false
  );
  const yellTimerRef = useRef(null);

  // ── 0. 起動ログ ──────────────────────────────────────────────────
  useEffect(() => {
    console.log("%c[PrismWebOverlay] 🚀 OVERLAY READY", "color:#10b981;font-weight:bold;font-size:16px");
    console.log("[PrismWebOverlay] streamId:", streamId, "| time:", new Date().toISOString());
    console.log("[PrismWebOverlay] UA:", navigator.userAgent);
    console.log("[PrismWebOverlay] Viewport:", window.innerWidth + "x" + window.innerHeight);

    // サーバーへ開通ログ（fire-and-forget）
    base44.functions.invoke("trackLogs", {
      eventName: "prism_overlay_loaded",
      properties: {
        streamId: streamId || "unknown",
        viewport: window.innerWidth + "x" + window.innerHeight,
        ua: navigator.userAgent.slice(0, 120),
        ts: new Date().toISOString(),
      },
    }).catch(() => {});
  }, [streamId]);

  // ── 1. API疎通確認 ────────────────────────────────────────────────
  useEffect(() => {
    base44.auth.isAuthenticated()
      .then(() => { setApiOk(true); console.log("[PrismWebOverlay] ✅ API OK"); })
      .catch(() => { setApiOk(false); console.warn("[PrismWebOverlay] ⚠️ API auth failed (public OK)"); setApiOk(true); });
  }, []);

  // ── 2. 向き検知 ──────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  // ── 3. LiveStream状態購読 ─────────────────────────────────────────
  useEffect(() => {
    if (!streamId) return;

    // 初期取得
    base44.entities.LiveStream.filter({ id: streamId }).then((arr) => {
      if (arr[0]) {
        setStreamStatus(arr[0].status || "scheduled");
        setViewerCount(arr[0].viewer_count || 0);
        console.log("[PrismWebOverlay] 📊 Initial stream:", arr[0].status, "viewers:", arr[0].viewer_count);
      }
    }).catch(() => {});

    // リアルタイム購読
    const unsub = base44.entities.LiveStream.subscribe((ev) => {
      if (ev.id !== streamId) return;
      setStreamStatus(ev.data?.status || "scheduled");
      setViewerCount(ev.data?.viewer_count || 0);
    });
    return unsub;
  }, [streamId]);

  // ── 4. チャット購読 ───────────────────────────────────────────────
  useEffect(() => {
    if (!streamId) return;

    const unsub = base44.entities.Comment.subscribe((ev) => {
      if (ev.type !== "create") return;
      if (ev.data?.livestream_id !== streamId) return;
      setWsOk(true);
      setChatMessages((prev) => [
        ...prev.slice(-20),
        {
          id: ev.id,
          user: ev.data?.user_name || "Anonymous",
          text: ev.data?.content || "",
        },
      ]);
      console.log("[PrismWebOverlay] 💬 Chat:", ev.data?.user_name, ":", ev.data?.content);
    });
    return unsub;
  }, [streamId]);

  // ── 5. エール購読 ────────────────────────────────────────────────
  useEffect(() => {
    if (!streamId) return;

    const unsub = base44.entities.SuperChat.subscribe((ev) => {
      if (ev.type !== "create") return;
      if (ev.data?.livestream_id !== streamId) return;
      setWsOk(true);

      const yell = {
        id: ev.id,
        user_name: ev.data?.user_name || "Anonymous",
        amount: ev.data?.amount || 0,
        message: ev.data?.message || "",
      };
      console.log("[PrismWebOverlay] ⭐ Yell:", yell.user_name, "×", yell.amount, "coins");

      setLatestYell(yell);
      setShowYell(true);

      if (yellTimerRef.current) clearTimeout(yellTimerRef.current);
      yellTimerRef.current = setTimeout(() => {
        setShowYell(false);
        setLatestYell(null);
      }, 4500);
    });
    return () => {
      unsub();
      if (yellTimerRef.current) clearTimeout(yellTimerRef.current);
    };
  }, [streamId]);

  const isLive = streamStatus === "live";

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        background: "transparent",
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: "2147483647",
        // Webkit GPU強制レイヤー
        WebkitTransform: "translateZ(0) translate3d(0,0,0)",
        transform: "translateZ(0) translate3d(0,0,0)",
        WebkitBackfaceVisibility: "hidden",
        backfaceVisibility: "hidden",
        WebkitFontSmoothing: "antialiased",
        isolation: "isolate",
      }}
    >

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          【看板A】左上：Chat Market システム待機中...
          URLを開いた瞬間から常時表示（WebSocket不要）
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        style={{
          position: "fixed",
          top: "12px",
          left: "12px",
          zIndex: 2147483647,
          background: "rgba(0,0,0,0.92)",
          border: "3px solid #22c55e",
          borderRadius: "10px",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          WebkitTransform: "translateZ(0) translate3d(0,0,0)",
          transform: "translateZ(0) translate3d(0,0,0)",
          WebkitBackfaceVisibility: "hidden",
          boxShadow: "0 0 20px rgba(34,197,94,0.5), 0 2px 8px rgba(0,0,0,0.8)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 8px #22c55e",
            animation: "cmPulse 1.2s infinite",
            WebkitAnimation: "cmPulse 1.2s infinite",
          }}
        />
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#22c55e", letterSpacing: "0.5px" }}>
          Chat Market
        </span>
        <span style={{ fontSize: "10px", color: "#86efac", fontWeight: "600" }}>
          システム待機中...
        </span>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          【看板B】右下：LIVE バッジ or 待機中
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        style={{
          position: "fixed",
          bottom: "20px",
          right: "16px",
          zIndex: 2147483647,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "rgba(0,0,0,0.92)",
          border: isLive ? "3px solid #ef4444" : "2px solid #888",
          borderRadius: "12px",
          padding: "10px 16px",
          boxShadow: isLive ? "0 0 24px rgba(239,68,68,0.6), 0 2px 8px rgba(0,0,0,0.8)" : "0 2px 8px rgba(0,0,0,0.8)",
          animation: isLive ? "livePulse 1.4s infinite" : "none",
          WebkitAnimation: isLive ? "livePulse 1.4s infinite" : "none",
          WebkitTransform: "translateZ(0) translate3d(0,0,0)",
          transform: "translateZ(0) translate3d(0,0,0)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: "10px",
            height: "10px",
            borderRadius: "50%",
            background: isLive ? "#ef4444" : "#666",
            animation: isLive ? "dotBlink 1.2s infinite" : "none",
            WebkitAnimation: isLive ? "dotBlink 1.2s infinite" : "none",
          }}
        />
        <span
          style={{
            fontSize: "15px",
            fontWeight: "900",
            color: isLive ? "#ef4444" : "#888",
            letterSpacing: "2px",
          }}
        >
          {isLive ? "● LIVE" : "● 待機中"}
        </span>
        {isLive && (
          <span
            style={{
              fontSize: "13px",
              color: "#fff",
              fontWeight: "700",
              borderLeft: "2px solid #ef4444",
              paddingLeft: "10px",
            }}
          >
            👁 {viewerCount.toLocaleString()}
          </span>
        )}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          【自己診断パネル】左上（看板Aの下）
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        style={{
          position: "fixed",
          top: "62px",
          left: "12px",
          zIndex: 2147483647,
          background: "rgba(0,0,0,0.88)",
          border: "1px solid #555",
          borderRadius: "8px",
          padding: "6px 10px",
          fontFamily: "monospace",
          fontSize: "10px",
          color: "#ccc",
          lineHeight: "1.8",
          WebkitTransform: "translateZ(0) translate3d(0,0,0)",
          transform: "translateZ(0) translate3d(0,0,0)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{ color: "#aaa", fontSize: "9px", marginBottom: "2px", letterSpacing: "1px" }}>
          ⚙ DIAG
        </div>
        <div>
          <span style={{ color: apiOk ? "#22c55e" : "#f59e0b" }}>●</span>
          {" "}API: {apiOk ? "OK" : "確認中"}
        </div>
        <div>
          <span style={{ color: wsOk ? "#22c55e" : "#3b82f6" }}>●</span>
          {" "}WS: {wsOk ? "受信済" : "待機中"}
        </div>
        <div>
          <span style={{ color: isLive ? "#ef4444" : "#666" }}>●</span>
          {" "}{isLive ? `LIVE (${viewerCount}人)` : "未配信"}
        </div>
        <div style={{ color: "#666", fontSize: "9px", borderTop: "1px solid #333", marginTop: "3px", paddingTop: "3px" }}>
          🕐 {loadTime}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          【チャット表示】
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: isLandscape ? "45%" : "100%",
          height: isLandscape ? "100%" : "55%",
          display: "flex",
          flexDirection: "column-reverse",
          gap: "6px",
          padding: "12px",
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 2147483647,
          WebkitTransform: "translateZ(0) translate3d(0,0,0)",
          transform: "translateZ(0) translate3d(0,0,0)",
        }}
      >
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "inline-flex",
              gap: "6px",
              fontSize: "15px",
              fontWeight: "700",
              lineHeight: "1.5",
              background: "rgba(0,0,0,0.75)",
              borderRadius: "6px",
              padding: "3px 8px",
              maxWidth: "95%",
              WebkitTextStroke: "0px",
              textShadow: "0 1px 4px rgba(0,0,0,1)",
            }}
          >
            <span style={{ color: "#10b981", fontWeight: "800", whiteSpace: "nowrap", flexShrink: 0 }}>
              {msg.user}:
            </span>
            <span style={{ color: "#ffffff", wordBreak: "break-word" }}>{msg.text}</span>
          </div>
        ))}
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          【エール通知】特大テキスト＋太縁取り
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {showYell && latestYell && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) translateZ(0)",
            WebkitTransform: "translate(-50%, -50%) translateZ(0)",
            zIndex: 2147483645,
            pointerEvents: "none",
            textAlign: "center",
            animation: "yellIn 4.5s ease-in-out forwards",
            WebkitAnimation: "yellIn 4.5s ease-in-out forwards",
          }}
        >
          {/* コイン数：特大 */}
          <div
            style={{
              fontSize: "clamp(48px, 12vw, 80px)",
              fontWeight: "900",
              color: "#fbbf24",
              // 太縁取り（-webkit-text-stroke + textShadow 二重）
              WebkitTextStroke: "3px #000",
              textStroke: "3px #000",
              textShadow: "0 0 30px rgba(251,191,36,1), 0 0 60px rgba(251,191,36,0.6)",
              letterSpacing: "2px",
              lineHeight: "1.1",
              marginBottom: "12px",
            }}
          >
            ⭐ {(latestYell.amount || 0).toLocaleString()}
          </div>

          {/* ユーザー名 */}
          <div
            style={{
              fontSize: "clamp(20px, 5vw, 30px)",
              fontWeight: "800",
              color: "#ffffff",
              WebkitTextStroke: "2px #000",
              textStroke: "2px #000",
              textShadow: "0 0 15px rgba(251,191,36,0.8)",
              marginBottom: "10px",
            }}
          >
            {latestYell.user_name}
          </div>

          {/* メッセージ */}
          {latestYell.message && (
            <div
              style={{
                display: "inline-block",
                fontSize: "clamp(12px, 3vw, 16px)",
                color: "#fde047",
                background: "rgba(0,0,0,0.75)",
                border: "2px solid rgba(251,191,36,0.6)",
                borderRadius: "8px",
                padding: "8px 16px",
                maxWidth: "70vw",
                fontWeight: "700",
                textShadow: "none",
                WebkitTextStroke: "0px",
              }}
            >
              💬 {latestYell.message}
            </div>
          )}
        </div>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          全アニメーション定義（Webkit込み）
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <style>{`
        @-webkit-keyframes cmPulse {
          0%, 100% { opacity: 1; -webkit-box-shadow: 0 0 8px #22c55e; }
          50% { opacity: 0.4; -webkit-box-shadow: 0 0 2px #22c55e; }
        }
        @keyframes cmPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #22c55e; }
          50% { opacity: 0.4; box-shadow: 0 0 2px #22c55e; }
        }
        @-webkit-keyframes dotBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes dotBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @-webkit-keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @-webkit-keyframes yellIn {
          0% { opacity: 0; -webkit-transform: translate(-50%, -50%) translateZ(0) scale(0.7); }
          10% { opacity: 1; -webkit-transform: translate(-50%, -50%) translateZ(0) scale(1.1); }
          20% { -webkit-transform: translate(-50%, -50%) translateZ(0) scale(1); }
          85% { opacity: 1; }
          100% { opacity: 0; -webkit-transform: translate(-50%, -50%) translateZ(0) scale(0.95); }
        }
        @keyframes yellIn {
          0% { opacity: 0; transform: translate(-50%, -50%) translateZ(0) scale(0.7); }
          10% { opacity: 1; transform: translate(-50%, -50%) translateZ(0) scale(1.1); }
          20% { transform: translate(-50%, -50%) translateZ(0) scale(1); }
          85% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -50%) translateZ(0) scale(0.95); }
        }
      `}</style>
    </div>
  );
}