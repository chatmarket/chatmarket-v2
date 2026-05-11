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

  // ページロード時のテストログ
  useEffect(() => {
    console.log('[PrismWebOverlay] 🚀 オーバーレイページロード');
    console.log('[PrismWebOverlay] 📍 streamId:', streamId);
    console.log('[PrismWebOverlay] 🌐 URL:', window.location.href);
    console.log('[PrismWebOverlay] ⏰ タイムスタンプ:', new Date().toISOString());
    console.log('[PrismWebOverlay] 📐 ビューポート:', `${window.innerWidth}x${window.innerHeight}`);
  }, [streamId]);

  // チャット購読
  useEffect(() => {
    if (!streamId) {
      console.log('[PrismWebOverlay] ⚠️ No streamId provided');
      return;
    }
    
    console.log('[PrismWebOverlay] ✅ Chat subscription started for:', streamId);
    
    const unsubscribeChat = base44.entities.Comment.subscribe((event) => {
      if (event.type !== "create") return;
      if (event.data?.livestream_id !== streamId) {
        console.log('[PrismWebOverlay] ⚠️ Chat event mismatch:', { expected: streamId, got: event.data?.livestream_id });
        return;
      }
      
      const msg = {
        id: event.id,
        user: event.data?.user_name || "Anonymous",
        text: event.data?.content || "",
        timestamp: new Date().toISOString(),
      };
      console.log('[PrismWebOverlay] 💬 Chat message:', { user: msg.user, text: msg.text, lag: `${Date.now() - new Date(event.data?.created_date).getTime()}ms` });
      setChatMessages((prev) => [...prev.slice(-20), msg]); // 最新20件キープ
    });

    return unsubscribeChat;
  }, [streamId]);

  // エール購読
  useEffect(() => {
    if (!streamId) {
      console.log('[PrismWebOverlay] ⚠️ No streamId for yell subscription');
      return;
    }

    console.log('[PrismWebOverlay] ✅ Yell subscription started for:', streamId);

    const unsubscribeYell = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create") return;
      if (event.data?.livestream_id !== streamId) {
        console.log('[PrismWebOverlay] ⚠️ Yell event mismatch:', { expected: streamId, got: event.data?.livestream_id });
        return;
      }

      const yell = {
        id: event.id,
        user: event.data?.user_name || "Anonymous",
        amount: event.data?.amount || 0,
        message: event.data?.message || "",
        timestamp: new Date().toISOString(),
      };
      
      const lagMs = Date.now() - new Date(event.data?.created_date).getTime();
      console.log('[PrismWebOverlay] 💰 SuperChat received:', { user: yell.user, amount: yell.amount, coins: yell.amount, lag: `${lagMs}ms` });
      console.log('[PrismWebOverlay] 🎨 Rendering yell notification — will auto-dismiss in 5s');
      
      setYellNotifications((prev) => [...prev, yell]);
      
      // 5秒後に自動削除
      setTimeout(() => {
        setYellNotifications((prev) => prev.filter((y) => y.id !== event.id));
        console.log('[PrismWebOverlay] 🗑️ Yell auto-dismissed');
      }, 5000);
    });

    return unsubscribeYell;
  }, [streamId]);

  // 🔇 オーバーレイ音声完全無音化 — 全ての audio/speechSynthesis を無効化
  useEffect(() => {
    console.log('[PrismWebOverlay] 🔇 Speech Synthesis disabled for overlay mode');
    // SpeechSynthesis 無効化
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "transparent",
        pointerEvents: "none",
      }}
      onLoad={() => console.log('[PrismWebOverlay] ✅ DOM rendered and ready')}
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