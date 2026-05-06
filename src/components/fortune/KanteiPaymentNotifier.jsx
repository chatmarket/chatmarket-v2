/**
 * KanteiPaymentNotifier
 * 占い師側ライブ配信中に「鑑定リクエスト＝コイン決済」が来た瞬間、
 * 5秒間だけ画面上部に「決済完了」フローティングを表示する。
 * BroadcasterStream / CreatorDashboard から channel_id を渡して使う。
 */
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Coins } from "lucide-react";

export default function KanteiPaymentNotifier({ channelId }) {
  const [notifications, setNotifications] = useState([]);
  const timersRef = useRef({});

  useEffect(() => {
    if (!channelId) return;

    const unsub = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create") return;
      const d = event.data;
      // channel_id が一致する鑑定リクエストのみ
      if (d?.channel_id !== channelId) return;

      const id = event.id || Date.now().toString();
      const notif = {
        id,
        userName: d.user_name || "ご依頼者",
        amount: d.amount || 0,
        message: d.message || "",
        ts: new Date(),
      };

      setNotifications((prev) => [...prev.slice(-3), notif]); // 最大4件

      // 5秒後に自動削除
      timersRef.current[id] = setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        delete timersRef.current[id];
      }, 5000);
    });

    return () => {
      unsub();
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, [channelId]);

  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "max(80px, calc(env(safe-area-inset-top, 0px) + 80px))",
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {notifications.map((n) => (
        <div
          key={n.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "linear-gradient(135deg, #052e16 0%, #064e3b 100%)",
            border: "1.5px solid #10b981",
            borderRadius: 16,
            padding: "12px 18px",
            boxShadow: "0 0 30px rgba(16,185,129,0.5), 0 4px 24px rgba(0,0,0,0.6)",
            minWidth: 260,
            animation: "kanteiNotifIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          {/* アイコン */}
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "rgba(16,185,129,0.2)",
            border: "1px solid rgba(16,185,129,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <CheckCircle2 style={{ width: 20, height: 20, color: "#10b981" }} />
          </div>

          {/* テキスト */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "#10b981", fontWeight: 900, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
              ✅ 決済完了
            </p>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>
              <span style={{ color: "#6ee7b7" }}>{n.userName}</span> さんから
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Coins style={{ width: 14, height: 14, color: "#fbbf24" }} />
              <span style={{ color: "#fbbf24", fontWeight: 900, fontSize: 18, lineHeight: 1 }}>{n.amount}</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>コイン 受領しました</span>
            </div>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes kanteiNotifIn {
          from { opacity: 0; transform: translateX(40px) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
}