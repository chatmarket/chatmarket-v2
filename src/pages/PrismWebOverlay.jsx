import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StreamOverlayChat from "@/components/overlay/StreamOverlayChat";
import StreamOverlayYell from "@/components/overlay/StreamOverlayYell";
import StreamStatusOverlay from "@/components/overlay/StreamStatusOverlay";
import StreamConnectionWelcome from "@/components/overlay/StreamConnectionWelcome";

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
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [chatOffset, setChatOffset] = useState("left"); // "left" or "right"
  const [streamStatus, setStreamStatus] = useState("scheduled");
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [healthCheckError, setHealthCheckError] = useState(null);

  // ページロード時のテストログ
  useEffect(() => {
    console.log('[PrismWebOverlay] 🚀 オーバーレイページロード');
    console.log('[PrismWebOverlay] 📍 streamId:', streamId);
    console.log('[PrismWebOverlay] 🌐 URL:', window.location.href);
    console.log('[PrismWebOverlay] ⏰ タイムスタンプ:', new Date().toISOString());
    console.log('[PrismWebOverlay] 📐 ビューポート:', `${window.innerWidth}x${window.innerHeight}`);
  }, [streamId]);

  // 📱 横向きモード検知 & オフセット制御
  useEffect(() => {
    const handleOrientationChange = () => {
      const landscape = window.innerWidth > window.innerHeight;
      setIsLandscape(landscape);
      if (landscape) {
        console.log('[PrismWebOverlay] 📱 Landscape mode detected — offset chat to right');
        setChatOffset("right");
      } else {
        console.log('[PrismWebOverlay] 📱 Portrait mode detected — chat to left');
        setChatOffset("left");
      }
    };
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);
    handleOrientationChange();
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
    };
  }, []);

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

  // 📊 ライブストリーム状態をリアルタイム購読
  useEffect(() => {
    if (!streamId) return;
    
    console.log('[PrismWebOverlay] 📡 LiveStream subscription started:', streamId);

    const unsubscribeLiveStream = base44.entities.LiveStream.subscribe((event) => {
      if (event.id !== streamId) return;
      
      const data = event.data;
      const newStatus = data?.status || "scheduled";
      const newViewers = data?.viewer_count || 0;
      
      setStreamStatus(newStatus);
      setViewerCount(newViewers);
      
      // ステータスが「live」に変わったら接続状態を確認
      if (newStatus === "live") {
        performHealthCheck();
      }
      
      console.log('[PrismWebOverlay] 🟢 Stream status updated:', { 
        status: newStatus, 
        viewers: newViewers,
        timestamp: new Date().toISOString()
      });
    });

    // 初期値を一度取得 + ヘルスチェック
    base44.entities.LiveStream.filter({ id: streamId }).then((streams) => {
      if (streams[0]) {
        setStreamStatus(streams[0].status || "scheduled");
        setViewerCount(streams[0].viewer_count || 0);
        console.log('[PrismWebOverlay] 📊 Initial stream state loaded:', { 
          status: streams[0].status,
          viewers: streams[0].viewer_count
        });
        
        // 配信中なら即座にヘルスチェック実施
        if (streams[0].status === "live") {
          performHealthCheck();
        }
      }
    });

    return unsubscribeLiveStream;
  }, [streamId]);

  // IVSチャンネルヘルスチェック
  const performHealthCheck = async () => {
    console.log('[PrismWebOverlay] 🏥 Performing IVS health check...');
    setIsConnecting(true);
    setHealthCheckError(null);
    
    try {
      const res = await base44.functions.invoke('healthCheckIvsChannel', { streamId });
      const data = res?.data;
      
      if (data?.success) {
        console.log('[PrismWebOverlay] ✅ Health check passed:', data);
        setIsConnecting(false);
      } else {
        console.log('[PrismWebOverlay] ⚠️ Health check failed:', data);
        setHealthCheckError(data?.message);
        setIsConnecting(true); // 接続準備中を継続表示
        
        // 自動復旧: チャンネル再生成が必要な場合
        if (data?.requiresReprovision) {
          console.log('[PrismWebOverlay] 🔧 Triggering channel reprovision...');
          try {
            const reprovRes = await base44.functions.invoke('forceReprovisionIvsChannel', { streamId });
            console.log('[PrismWebOverlay] ✅ Reprovision result:', reprovRes?.data);
            setIsConnecting(false);
          } catch (reprovErr) {
            console.error('[PrismWebOverlay] ❌ Reprovision failed:', reprovErr);
            setIsConnecting(false);
            setHealthCheckError('チャンネル復旧に失敗しました。OBSを再起動してください。');
          }
        }
      }
    } catch (err) {
      console.error('[PrismWebOverlay] ❌ Health check error:', err);
      setHealthCheckError('接続状態を確認できません。');
      setIsConnecting(false);
    }
  };

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
      {/* チャット（横向きモード対応） */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          [isLandscape && chatOffset === "right" ? "right" : "left"]: 0,
          [isLandscape ? "width" : "width"]: isLandscape ? "40%" : "100%",
          height: isLandscape ? "100%" : "60%",
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

      {/* ライブステータス & 視聴者数 */}
      <StreamStatusOverlay 
        isLive={streamStatus === "live"} 
        viewerCount={viewerCount}
        status={streamStatus}
        isConnecting={isConnecting}
      />

      {/* 接続成功ウェルカムメッセージ（オープニング） */}
      <StreamConnectionWelcome streamId={streamId} />
    </div>
  );
}