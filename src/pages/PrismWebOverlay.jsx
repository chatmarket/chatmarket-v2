import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * PrismWebOverlay — 本番ゴーストUI版
 * ✅ DIAGパネル完全撤去
 * ✅ チャット: ゴースト表示（文字が浮かび上がる）
 * ✅ エール: 特大アニメーション維持
 * ✅ 左上バッジ: コンパクトに残す（接続確認用）
 * ✅ Comment / SuperChat 両方をstreamIdで購読
 */
export default function PrismWebOverlay() {
  const { streamId } = useParams();
  const [chatMessages, setChatMessages] = useState([]);
  const [latestYell, setLatestYell] = useState(null);
  const [showYell, setShowYell] = useState(false);
  const [streamStatus, setStreamStatus] = useState("scheduled");
  const [viewerCount, setViewerCount] = useState(0);
  const yellTimerRef = useRef(null);

  const isLive = streamStatus === "live";

  // ── 起動ログ ─────────────────────────────────────────────────────
  useEffect(() => {
    console.log("[PrismWebOverlay] 🚀 streamId:", streamId);
  }, [streamId]);

  // ── LiveStream状態購読 ────────────────────────────────────────────
  useEffect(() => {
    if (!streamId) return;

    base44.entities.LiveStream.filter({ id: streamId }).then((arr) => {
      if (arr[0]) {
        setStreamStatus(arr[0].status || "scheduled");
        setViewerCount(arr[0].viewer_count || 0);
      }
    }).catch(() => {});

    const unsub = base44.entities.LiveStream.subscribe((ev) => {
      if (ev.id !== streamId) return;
      setStreamStatus(ev.data?.status || "scheduled");
      setViewerCount(ev.data?.viewer_count || 0);
    });
    return unsub;
  }, [streamId]);

  // ── チャット購読（Comment エンティティ） ─────────────────────────
  useEffect(() => {
    if (!streamId) return;

    // 既存コメントを最大5件取得（初期表示）
    base44.entities.Comment.filter({ livestream_id: streamId })
      .then((arr) => {
        if (arr && arr.length > 0) {
          const recent = arr.slice(-5).map((c) => ({
            id: c.id,
            user: c.user_name || "匿名",
            text: c.content || "",
          }));
          setChatMessages(recent);
        }
      }).catch(() => {});

    // リアルタイム購読
    const unsub = base44.entities.Comment.subscribe((ev) => {
      if (ev.type !== "create") return;
      // livestream_id または stream_id でマッチ
      const d = ev.data || {};
      const matchId = d.livestream_id === streamId || d.stream_id === streamId;
      if (!matchId) return;

      setChatMessages((prev) => [
        ...prev.slice(-19),
        {
          id: ev.id || String(Date.now()),
          user: d.user_name || "匿名",
          text: d.content || d.text || "",
        },
      ]);
      console.log("[PrismOverlay] 💬", d.user_name, ":", d.content);
    });
    return unsub;
  }, [streamId]);

  // ── エール購読（SuperChat エンティティ） ─────────────────────────
  useEffect(() => {
    if (!streamId) return;

    const unsub = base44.entities.SuperChat.subscribe((ev) => {
      if (ev.type !== "create") return;
      const d = ev.data || {};
      const matchId = d.livestream_id === streamId || d.stream_id === streamId;
      if (!matchId) return;

      const yell = {
        id: ev.id,
        user_name: d.user_name || "匿名",
        amount: d.amount || 0,
        message: d.message || "",
      };
      console.log("[PrismOverlay] ⭐ Yell:", yell.user_name, "×", yell.amount);

      setLatestYell(yell);
      setShowYell(true);

      if (yellTimerRef.current) clearTimeout(yellTimerRef.current);
      yellTimerRef.current = setTimeout(() => {
        setShowYell(false);
        setLatestYell(null);
      }, 5000);
    });
    return () => {
      unsub();
      if (yellTimerRef.current) clearTimeout(yellTimerRef.current);
    };
  }, [streamId]);

  // ── RENDER ───────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      width: "100vw", height: "100vh",
      background: "transparent",
      pointerEvents: "none",
      overflow: "hidden",
      zIndex: 2147483647,
      WebkitTransform: "translateZ(0) translate3d(0,0,0)",
      transform: "translateZ(0) translate3d(0,0,0)",
      WebkitBackfaceVisibility: "hidden",
      backfaceVisibility: "hidden",
    }}>

      {/* ━━ 左上: 最小バッジ（接続状態のみ・コンパクト） ━━ */}
      <div style={{
        position: "fixed",
        top: "10px", left: "10px",
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.6)",
        border: `1px solid ${isLive ? "#22c55e" : "#555"}`,
        borderRadius: "20px",
        padding: "4px 10px",
        display: "flex", alignItems: "center", gap: "5px",
        WebkitTransform: "translateZ(0)",
      }}>
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: isLive ? "#22c55e" : "#666",
          display: "inline-block",
          animation: isLive ? "dotBlink 1.2s infinite" : "none",
          WebkitAnimation: isLive ? "dotBlink 1.2s infinite" : "none",
        }} />
        <span style={{ fontSize: "10px", fontWeight: "700", color: isLive ? "#22c55e" : "#888", fontFamily: "-apple-system, sans-serif" }}>
          {isLive ? `LIVE · ${viewerCount}人` : "CM"}
        </span>
      </div>

      {/* ━━ チャット表示エリア（ゴーストUI） ━━ */}
      {/* 下から積み上がるコメント。背景なし・文字だけ浮かぶ */}
      <div style={{
        position: "fixed",
        bottom: "16px",
        left: "8px",
        right: "8px",
        zIndex: 2147483647,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        alignItems: "flex-start",
        WebkitTransform: "translateZ(0)",
        transform: "translateZ(0)",
      }}>
        {chatMessages.slice(-8).map((msg, i) => {
          // 一番新しいメッセージほど不透明に
          const total = Math.min(chatMessages.length, 8);
          const idx = chatMessages.slice(-8).indexOf(msg);
          const opacity = 0.4 + (idx / (total - 1 || 1)) * 0.6;
          return (
            <div key={msg.id} style={{
              display: "inline-flex",
              gap: "5px",
              fontSize: "15px",
              fontWeight: "800",
              lineHeight: "1.4",
              opacity: opacity,
              // テキストシャドウで縁取り（背景なし）
              textShadow: "0 1px 3px rgba(0,0,0,1), 0 0 8px rgba(0,0,0,1), 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
              WebkitTransform: "translateZ(0)",
              maxWidth: "90vw",
              animation: i === chatMessages.slice(-8).length - 1 ? "msgIn 0.3s ease-out" : "none",
              WebkitAnimation: i === chatMessages.slice(-8).length - 1 ? "msgIn 0.3s ease-out" : "none",
            }}>
              <span style={{ color: "#4ade80", whiteSpace: "nowrap", flexShrink: 0, fontFamily: "-apple-system, sans-serif" }}>
                {msg.user}
              </span>
              <span style={{ color: "#ffffff", wordBreak: "break-word", fontFamily: "-apple-system, sans-serif" }}>
                {msg.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* ━━ エール通知（特大・中央） ━━ */}
      {showYell && latestYell && (
        <div style={{
          position: "fixed",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%) translateZ(0)",
          WebkitTransform: "translate(-50%, -50%) translateZ(0)",
          zIndex: 2147483646,
          pointerEvents: "none",
          textAlign: "center",
          animation: "yellIn 5s ease-in-out forwards",
          WebkitAnimation: "yellIn 5s ease-in-out forwards",
        }}>
          <div style={{
            fontSize: "clamp(52px, 14vw, 88px)",
            fontWeight: "900",
            color: "#fbbf24",
            WebkitTextStroke: "3px #000",
            textShadow: "0 0 40px rgba(251,191,36,1), 0 0 80px rgba(251,191,36,0.5)",
            lineHeight: "1.1",
            marginBottom: "10px",
            fontFamily: "-apple-system, sans-serif",
          }}>
            ⭐ {(latestYell.amount || 0).toLocaleString()}
          </div>
          <div style={{
            fontSize: "clamp(18px, 5vw, 28px)",
            fontWeight: "800",
            color: "#fff",
            WebkitTextStroke: "2px #000",
            textShadow: "0 0 20px rgba(251,191,36,0.9)",
            marginBottom: "8px",
            fontFamily: "-apple-system, sans-serif",
          }}>
            {latestYell.user_name} さん
          </div>
          {latestYell.message && (
            <div style={{
              display: "inline-block",
              fontSize: "clamp(13px, 3.5vw, 18px)",
              color: "#fde047",
              background: "rgba(0,0,0,0.7)",
              border: "2px solid rgba(251,191,36,0.7)",
              borderRadius: "10px",
              padding: "8px 18px",
              maxWidth: "75vw",
              fontWeight: "700",
              fontFamily: "-apple-system, sans-serif",
            }}>
              💬 {latestYell.message}
            </div>
          )}
        </div>
      )}

      {/* ━━ アニメーション定義 ━━ */}
      <style>{`
        @-webkit-keyframes dotBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @keyframes dotBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        @-webkit-keyframes msgIn {
          0% { opacity: 0; -webkit-transform: translateX(-12px) translateZ(0); }
          100% { opacity: 1; -webkit-transform: translateX(0) translateZ(0); }
        }
        @keyframes msgIn {
          0% { opacity: 0; transform: translateX(-12px) translateZ(0); }
          100% { opacity: 1; transform: translateX(0) translateZ(0); }
        }
        @-webkit-keyframes yellIn {
          0%   { opacity: 0; -webkit-transform: translate(-50%,-50%) translateZ(0) scale(0.6); }
          12%  { opacity: 1; -webkit-transform: translate(-50%,-50%) translateZ(0) scale(1.1); }
          22%  { -webkit-transform: translate(-50%,-50%) translateZ(0) scale(1); }
          82%  { opacity: 1; }
          100% { opacity: 0; -webkit-transform: translate(-50%,-50%) translateZ(0) scale(0.95); }
        }
        @keyframes yellIn {
          0%   { opacity: 0; transform: translate(-50%,-50%) translateZ(0) scale(0.6); }
          12%  { opacity: 1; transform: translate(-50%,-50%) translateZ(0) scale(1.1); }
          22%  { transform: translate(-50%,-50%) translateZ(0) scale(1); }
          82%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%,-50%) translateZ(0) scale(0.95); }
        }
      `}</style>
    </div>
  );
}