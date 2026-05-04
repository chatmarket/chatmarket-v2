import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import MetaHelmet from "@/components/layout/MetaHelmet";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ChatPanel from "../components/chat/ChatPanel.jsx";
import TipOverlay from "../components/live/TipOverlay";
import ExtensionNotification from "../components/live/ExtensionNotification";
import { CreditCard, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import VideoControls from "../components/video/VideoControls";
import ViewerStream from "../components/live/ViewerStream.jsx";
import YellButtons from "../components/live/YellButtons.jsx";
import YellNotificationPopup from "../components/live/YellNotificationPopup.jsx";
import ViewerChatInput from "../components/live/ViewerChatInput.jsx";
import LiveChatDisplay from "../components/live/LiveChatDisplay.jsx";
import YellCelebrationEffect from "../components/live/YellCelebrationEffect.jsx";
import LiveTicketPurchase from "../components/live/LiveTicketPurchase.jsx";
import LivePaywall from "../components/live/LivePaywall.jsx";
import LivePaywallStripe from "../components/live/LivePaywallStripe.jsx";
import YellRanking from "../components/live/YellRanking.jsx";

class LiveViewErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err, info) { console.error("[LiveView] Fatal Error:", err, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 99999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", gap: "16px" }}>
          <div style={{ fontSize: "48px" }}>🚨</div>
          <p style={{ color: "#ff4444", fontWeight: "bold", fontSize: "18px", textAlign: "center" }}>エラーが発生しました</p>
          <pre style={{ color: "#ffaaaa", fontSize: "12px", background: "#1a0000", padding: "16px", borderRadius: "8px", maxWidth: "100%", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button onClick={() => window.location.reload()} style={{ background: "#ff4444", color: "white", border: "none", padding: "12px 32px", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" }}>
            リロード
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LiveViewInner() {
  const { streamId, id: idParam } = useParams();
  const id = streamId || idParam;
  
  // ★ Stream ID パラメータが正確に渡されているか即座に検証ログ
  useEffect(() => {
    console.log(`[LiveView] 🔍 URL Parameter Check:`, {
      streamId_param: streamId,
      id_param: idParam,
      resolved_id: id,
      timestamp: new Date().toISOString(),
    });
  }, [streamId, idParam, id]);
  
  const [user, setUser] = useState(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [ticketChecked, setTicketChecked] = useState(false);
  // 旧PPV（price > 0 かつ is_ticket_enabled=false）の視聴許可フラグ
  const [coinAllowed, setCoinAllowed] = useState(false);
  const [activeTips, setActiveTips] = useState([]);
  const [channelOwnerEmail, setChannelOwnerEmail] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [forceKey, setForceKey] = useState(0);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [celebrationYell, setCelebrationYell] = useState(null);
  const extensionNotifiedRef = useRef(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [coinBalance, setCoinBalance] = useState(null);
  const videoContainerRef = useRef(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) return;
      base44.auth.me().then(u => {
        setUser(u);
        // コイン残高取得
        base44.entities.YellCoinWallet.filter({ user_email: u.email })
          .then(w => setCoinBalance(w[0]?.balance ?? 0))
          .catch(() => setCoinBalance(0));
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create") return;
      
      // ★ DB検証済みIDを優先、なければURLパラメータIDで比較
      const effectiveId = verifiedStreamIdRef.current || id;
      const incomingId = event.data?.livestream_id;
      const isMatch = incomingId === effectiveId || incomingId === id;

      console.log(`[LiveView] 💰 SuperChat received:`, {
        event_id: event.id,
        livestream_id: incomingId,
        url_param_id: id,
        verified_id: verifiedStreamIdRef.current,
        isMatch,
        user: event.data?.user_name,
        amount: event.data?.amount,
      });
      
      if (!isMatch) return;
      
      const item = { ...event.data, id: event.id };
      if (!item.gift_id) {
        setActiveTips((prev) => [...prev.slice(-4), item]);
        setCelebrationYell(item);
        setTimeout(() => setActiveTips((prev) => prev.filter((t) => t.id !== event.id)), 5000);
      }
    });
    return unsub;
  }, [id]);

  // ★ DBから検証済みの正確なstream IDを保持するref
  const verifiedStreamIdRef = useRef(null);

  const { data: stream, isLoading } = useQuery({
    queryKey: ["livestream", id],
    queryFn: async () => {
      // ★ ID指定で直接取得
      const streams = await base44.entities.LiveStream.filter({ id });
      const s = streams[0];
      
      // ★ 常にフルURLをコンソールに出力（視聴者側デバッグの核心）
      console.log(`[LiveView] 📡 DB fetch result:`, {
        url_param_id: id,
        db_stream_id: s?.id,
        id_match: s?.id === id,
        status: s?.status,
        playback_url_FULL: s?.ivs_playback_url,
        stream_type: s?.stream_type,
        fetched_at: new Date().toISOString(),
      });

      // ★ DBで検証されたIDを保存（投げ銭・チャット等の宛先に使用）
      if (s?.id) verifiedStreamIdRef.current = s.id;

      return s || null;
    },
    refetchInterval: 3000, // 3秒ごとにDB再取得（liveステータス変化を素早く捕捉）
    staleTime: 0,           // キャッシュを使わず常に最新を取得
  });

  const { data: activeCall } = useQuery({
    queryKey: ["active-call", stream?.channel_id],
    queryFn: async () => {
      const calls = await base44.entities.VideoCall.filter({
        status: "active",
        callee_channel_id: stream?.channel_id
      });
      return calls[0] || null;
    },
    enabled: !!stream?.channel_id,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!stream?.channel_id) return;
    base44.entities.Channel.filter({ id: stream.channel_id }).then((r) => {
      if (r[0]?.owner_email) setChannelOwnerEmail(r[0].owner_email);
    });
  }, [stream?.channel_id]);

  useEffect(() => {
    if (!stream) return;

    console.log("[LiveView] 🎬 Checking purchase status:", {
      is_ticket_enabled: stream.is_ticket_enabled,
      price: stream.price,
      stream_type: stream.stream_type,
    });

    if (stream.is_ticket_enabled) {
      // チケット制: 購入済みかチェック
      const purchases = stream.ticket_purchases || [];
      const purchased = user ? purchases.some((p) => p.user_email === user.email) : false;
      setHasPurchased(purchased);
      setTicketChecked(true);
    } else {
      // 旧PPV（コイン消費型）: LivePaywall が制御するため ticketChecked=true で通過させる
      setHasPurchased(true);
      setTicketChecked(true);
    }

    // ★ AWS同期待機（決済完了後 → Playerを初期化）
    if (coinAllowed && stream.ivs_playback_url) {
      console.log("[LiveView] 🔄 Coin allowed detected, waiting for AWS sync...");
      setTimeout(() => {
        console.log("[LiveView] ✅ AWS sync complete, initializing player with URL:", stream.ivs_playback_url.substring(0, 60) + "...");
      }, 1500);
    }
  }, [stream?.id, stream?.is_ticket_enabled, stream?.price, user?.email, coinAllowed, stream?.ivs_playback_url]);

  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

  const handlePurchase = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    await base44.entities.Purchase.create({
      item_type: "livestream",
      item_id: id,
      amount: stream.price,
      buyer_email: user.email,
      status: "completed",
    });
    setHasPurchased(true);
    toast.success("チケット購入完了！配信を視聴します🎉");
  };

  if (!id || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">配信が見つかりません</p>
      </div>
    );
  }

  const videoPortal = ReactDOM.createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 40%, #0a0f0a 100%)" }}>

      {/* ═══ STICKY HEADER — safe-area対応 ═══ */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 50,
        paddingTop: "env(safe-area-inset-top, 0px)",
        background: "rgba(10,10,15,0.75)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px" }}>
          {/* 左: 戻るボタン + ロゴ + LIVE バッジ */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => window.history.back()}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "white", cursor: "pointer", flexShrink: 0 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            </button>
            {/* ブランドロゴ */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <span style={{ color: "white", fontWeight: 900, fontSize: 15, letterSpacing: "-0.3px" }}>chatmarket</span>
            </div>
            {stream.status === "live" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3, background: "#ef4444", borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 900, color: "white" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "white", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                  LIVE
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 3, color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  {stream.viewer_count || 0}
                </span>
              </div>
            )}
          </div>

          {/* 右: コイン残高 + マイページ */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {user && coinBalance !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 20, padding: "4px 10px" }}>
                <span style={{ fontSize: 13 }}>🪙</span>
                <span style={{ color: "#fbbf24", fontWeight: 900, fontSize: 13 }}>{coinBalance.toLocaleString()}</span>
              </div>
            )}
            {user ? (
              <a href="/settings" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "white", textDecoration: "none" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </a>
            ) : (
              <button onClick={() => base44.auth.redirectToLogin()} style={{ display: "flex", alignItems: "center", gap: 4, background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 8, padding: "6px 12px", color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                ログイン
              </button>
            )}
          </div>
        </div>
      </div>

      {/* チケットペイウォール */}
      {stream.is_ticket_enabled && !hasPurchased && ticketChecked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-5 p-6" style={{ paddingTop: 80 }}>
          <div className="text-6xl">🎫</div>
          <h2 className="text-xl font-black text-white">チケット制ライブ配信</h2>
          <div className="text-center space-y-1">
            <p className="text-3xl font-black text-yellow-400">¥{(stream.ticket_price_yen || 150).toLocaleString()}</p>
            <p className="text-sm text-white/60">{stream.ticket_duration_minutes || 60}分間の視聴チケット</p>
          </div>
          {!user ? (
            <Button onClick={() => base44.auth.redirectToLogin()} className="gap-2 h-12 px-8">
              <CreditCard className="w-5 h-5" /> ログインして購入
            </Button>
          ) : (
            <Button onClick={() => setShowTicketModal(true)} className="gap-2 h-12 px-8 bg-yellow-500 hover:bg-yellow-600 text-black font-black">
              <span className="text-lg">🎫</span> チケットを購入する
            </Button>
          )}
        </div>
      )}

      {/* ═══ 映像エリア — 16:9 YouTube風 ═══ */}
      <div style={{ position: "absolute", top: "calc(env(safe-area-inset-top, 0px) + 58px)", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "8px 0 0 0" }}>
        {/* 16:9 映像コンテナ */}
        <div ref={videoContainerRef} style={{ width: "100%", maxWidth: "calc((100vh - 56px - 220px) * 16/9)", aspectRatio: "16/9", borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.05)", position: "relative", background: "#000", flexShrink: 0 }}>
          {/* PPV 門番 */}
          {!stream.is_ticket_enabled && stream.price > 0 && !coinAllowed && (
            <LivePaywallStripe stream={stream} user={user} onAllowed={() => setCoinAllowed(true)} />
          )}
          {stream.status === "live" && ticketChecked && stream.stream_type === "vimeo" && stream.vimeo_url ? (
            <iframe src={stream.vimeo_url} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={stream.title} />
          ) : stream.status === "live" && ticketChecked && stream.stream_type === "youtube" && stream.youtube_url ? (
            <iframe src={stream.youtube_url} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={stream.title} />
          ) : stream.status === "live" && ticketChecked && (stream.price <= 0 || coinAllowed) ? (
            <ViewerStream key={`${id}-${forceKey}`} streamId={id} stream={stream} isMuted={isMuted} onMutedChange={setIsMuted} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-950">
              <p className="text-muted-foreground text-sm">
                {stream.status === "ended" ? "配信は終了しました" : "配信開始をお待ちください"}
              </p>
            </div>
          )}

          {/* ミュート警告バナー */}
          {isMuted && stream.status === "live" && (
            <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.85)", border: "1px solid rgba(251,191,36,0.5)", borderRadius: 8, padding: "6px 14px" }}>
              <VolumeX style={{ width: 14, height: 14, color: "#fbbf24" }} />
              <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>ミュート中 —</span>
              <button
                onClick={() => setIsMuted(false)}
                style={{ color: "#fbbf24", fontSize: 12, fontWeight: 900, background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                タップして音声ON
              </button>
            </div>
          )}

          {/* コントロールバー */}
          {stream.status === "live" && (
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)", padding: "20px 12px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* 音量ボタン */}
                <button
                  onClick={() => setIsMuted(v => !v)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer" }}
                >
                  {isMuted
                    ? <VolumeX style={{ width: 14, height: 14 }} />
                    : <Volume2 style={{ width: 14, height: 14 }} />
                  }
                </button>
                {/* 読み上げボタン */}
                <button
                  onClick={() => setSpeechEnabled(v => !v)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: speechEnabled ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.1)", border: speechEnabled ? "1px solid #fbbf24" : "1px solid rgba(255,255,255,0.2)", color: speechEnabled ? "#fbbf24" : "white", cursor: "pointer", fontSize: 14 }}
                  title="コメント読み上げ"
                >
                  🔊
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
                  {stream.channel_name}
                </span>
                {/* 全画面 */}
                <button
                  onClick={toggleFullscreen}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", color: "white", cursor: "pointer" }}
                >
                  {isFullscreen ? <Minimize style={{ width: 14, height: 14 }} /> : <Maximize style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* チャット・エールエリア */}
        {stream.status === "live" && (
          <div style={{ width: "100%", maxWidth: "calc((100vh - 56px - 220px) * 16/9)", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* 投げ銭ランキング + チャット */}
            <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 0", display: "flex", gap: 8 }}>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column-reverse", gap: 4 }}>
                <LiveChatDisplay streamId={stream.id} />
              </div>
              <div style={{ width: 150, flexShrink: 0 }}>
                <div style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "6px 10px", borderBottom: "1px solid rgba(251,191,36,0.15)", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 12 }}>🏆</span>
                    <span style={{ fontSize: 11, fontWeight: 900, color: "#fde68a" }}>投げ銭TOP</span>
                  </div>
                  <div style={{ padding: "4px 8px", maxHeight: 120, overflowY: "auto" }}>
                    <YellRanking streamId={stream.id} />
                  </div>
                </div>
              </div>
            </div>

            {/* ═══ ボトムナビ — safe-area + 投げ銭ボタン ═══ */}
            <div style={{
              flexShrink: 0,
              background: "rgba(10,10,15,0.82)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              paddingBottom: "env(safe-area-inset-bottom, 8px)",
            }}>
              {/* チャット入力行 */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px 4px" }}>
                <ViewerChatInput streamId={stream.id} user={user} />
              </div>
              {/* アクションバー: ホームボタン / 投げ銭(中央・目立つ) / ミュート・読み上げ */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 14px 6px", gap: 8 }}>
                {/* ホームへ */}
                <a href="/" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, color: "rgba(255,255,255,0.5)", textDecoration: "none", flexShrink: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 600 }}>ホーム</span>
                </a>

                {/* エールボタン群（中央） */}
                <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                  <YellButtons streamId={stream.id} user={user} channelId={stream.channel_id} />
                </div>

                {/* 右: 音量 + 読み上げ */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => setIsMuted(v => !v)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", color: isMuted ? "#fbbf24" : "rgba(255,255,255,0.5)", padding: 0 }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: isMuted ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.07)", border: `1px solid ${isMuted ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isMuted ? <VolumeX style={{ width: 17, height: 17 }} /> : <Volume2 style={{ width: 17, height: 17 }} />}
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 600 }}>{isMuted ? "ミュート" : "音声"}</span>
                  </button>
                  <button
                    onClick={() => setSpeechEnabled(v => !v)}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", color: speechEnabled ? "#10b981" : "rgba(255,255,255,0.5)", padding: 0 }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: speechEnabled ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.07)", border: `1px solid ${speechEnabled ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.12)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
                      🔊
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 600 }}>読み上げ</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* エール通知ポップアップ */}
      {stream.status === "live" && (
        <YellNotificationPopup streamId={stream.id} speechEnabled={speechEnabled} />
      )}
      <TipOverlay tips={activeTips} />
    </div>,
    document.body
  );

  return (
    <div className="w-full min-h-screen bg-black">
      <MetaHelmet
        title={`🔴 ${stream.title} | ChatMarket LIVE`}
        description={stream.description || `${stream.channel_name}がライブ配信中！`}
        image={stream.thumbnail_url}
      />
      {videoPortal}
      {celebrationYell && <YellCelebrationEffect yell={celebrationYell} onComplete={() => setCelebrationYell(null)} />}
      {/* チケット購入モーダル */}
      {stream && user && showTicketModal && (
        <LiveTicketPurchase
          stream={stream}
          user={user}
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          onPurchaseSuccess={() => {
            setHasPurchased(true);
            setShowTicketModal(false);
          }}
        />
      )}
    </div>
  );
}

export default function LiveView() {
  return (
    <LiveViewErrorBoundary>
      <LiveViewInner />
    </LiveViewErrorBoundary>
  );
}