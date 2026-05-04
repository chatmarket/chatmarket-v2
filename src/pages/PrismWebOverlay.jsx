import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StreamOverlayChat from "@/components/overlay/StreamOverlayChat";
import StreamOverlayYell from "@/components/overlay/StreamOverlayYell";

/**
 * PrismWebOverlay
 * Prism Live Studioの「Web Overlay」機能に対応した透過背景ページ
 * チャットとエール通知が下から上に流れるだけのシンプル設計
 * 
 * 使用方法:
 * Prism → Web Overlay → URL: https://chatmarket.app/prism-overlay/:streamId
 */
export default function PrismWebOverlay() {
  const { streamId } = useParams();
  const [chatMessages, setChatMessages] = useState([]);
  const [yellowNotifications, setYellNotifications] = useState([]);

  // チャット購読
  useEffect(() => {
    if (!streamId) return;
    
    const unsubscribeChat = base44.entities.Comment.subscribe((event) => {
      if (event.type !== "create" || event.data?.livestream_id !== streamId) return;
      
      const msg = {
        id: event.id,
        user: event.data?.user_name || "Anonymous",
        text: event.data?.content || "",
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev.slice(-20), msg]); // 最新20件キープ
    });

    return unsubscribeChat;
  }, [streamId]);

  // エール購読
  useEffect(() => {
    if (!streamId) return;

    const unsubscribeYell = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create" || event.data?.livestream_id !== streamId) return;

      const yell = {
        id: event.id,
        user: event.data?.user_name || "Anonymous",
        amount: event.data?.amount || 0,
        message: event.data?.message || "",
        timestamp: new Date().toISOString(),
      };
      
      setYellNotifications((prev) => [...prev, yell]);
      
      // 5秒後に自動削除
      setTimeout(() => {
        setYellNotifications((prev) => prev.filter((y) => y.id !== event.id));
      }, 5000);
    });

    return unsubscribeYell;
  }, [streamId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "transparent",
        pointerEvents: "none",
      }}
    >
      {/* チャット（下から上へ流れる） */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "60%",
          pointerEvents: "none",
        }}
      >
        <StreamOverlayChat messages={chatMessages} />
      </div>

      {/* エール通知（派手なエフェクト） */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {yellowNotifications.map((yell) => (
          <StreamOverlayYell key={yell.id} yell={yell} />
        ))}
      </div>
    </div>
  );
}