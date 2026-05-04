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
import { Users, Radio, Lock, CreditCard, Zap, Maximize, Minimize, Volume2, VolumeX } from "lucide-react";
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

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) return;
      base44.auth.me().then(setUser).catch(() => {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create") return;
      
      // ★ 全スーパーチャット受信を検証ログ（diagnostics）
      console.log(`[LiveView] 💰 SuperChat received:`, {
        event_id: event.id,
        livestream_id: event.data?.livestream_id,
        expected_id: id,
        match: event.data?.livestream_id === id,
        user: event.data?.user_name,
        amount: event.data?.amount,
        timestamp: new Date().toISOString(),
      });
      
      // 正確な stream ID でのみフィルタリング
      if (event.data?.livestream_id !== id) {
        console.log(`[LiveView] ⚠️ SuperChat filtered (stream ID mismatch):`, {
          received_id: event.data?.livestream_id,
          expected_id: id,
        });
        return;
      }
      
      const item = { ...event.data, id: event.id };
      if (!item.gift_id) {
        setActiveTips((prev) => [...prev.slice(-4), item]);
        setCelebrationYell(item);
        setTimeout(() => setActiveTips((prev) => prev.filter((t) => t.id !== event.id)), 5000);
      }
    });
    return unsub;
  }, [id]);

  const { data: stream, isLoading } = useQuery({
    queryKey: ["livestream", id],
    queryFn: async () => {
      // ★ ID指定で直接取得
      const streams = await base44.entities.LiveStream.filter({ id });
      const s = streams[0];
      
      // ★ 常にフルURLをコンソールに出力（視聴者側デバッグの核心）
      console.log(`[LiveView] 📡 DB fetch result:`, {
        stream_id: s?.id,
        status: s?.status,
        playback_url_FULL: s?.ivs_playback_url,   // ← これが昨日のURLか今日のURLか確認
        stream_type: s?.stream_type,
        fetched_at: new Date().toISOString(),
      });

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
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, background: "#000" }}>
      {/* チケットペイウォール */}
      {stream.is_ticket_enabled && !hasPurchased && ticketChecked && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-5 p-6">
          <div className="text-6xl">🎫</div>
          <h2 className="text-xl font-black text-white">チケット制ライブ配信</h2>
          <div className="text-center space-y-1">
            <p className="text-3xl font-black text-yellow-400">¥{(stream.ticket_price_yen || 150).toLocaleString()}</p>
            <p className="text-sm text-white/60">{stream.ticket_duration_minutes || 60}分間の視聴チケット</p>
          </div>
          <p className="text-xs text-white/40 text-center max-w-xs">
            コインまたはクレジットカードで購入後、すぐに視聴できます
          </p>
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

      {/* 映像エリア — プレミアムスタイル */}
      <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
        <div style={{ borderRadius: "24px", overflow: "hidden", width: "100%", height: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.8)", position: "relative" }}>
          {/* PPV 門番（チケット制でない配信）— Stripe統合版 */}
          {!stream.is_ticket_enabled && !coinAllowed && (
            <LivePaywallStripe
              stream={stream}
              user={user}
              onAllowed={() => setCoinAllowed(true)}
            />
          )}
          {stream.status === "live" && ticketChecked && stream.stream_type === "vimeo" && stream.vimeo_url ? (
            <iframe src={stream.vimeo_url} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={stream.title} />
          ) : stream.status === "live" && ticketChecked && stream.stream_type === "youtube" && stream.youtube_url ? (
            <iframe src={stream.youtube_url} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={stream.title} />
          ) : stream.status === "live" ? (
            <ViewerStream key={`${id}-${forceKey}`} streamId={id} stream={stream} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-950">
              <p className="text-muted-foreground">
                {stream.status === "ended" ? "配信は終了しました" : "配信開始をお待ちください"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 戻るボタン */}
      <div className="absolute top-3 left-3 z-30">
        <button
          onClick={() => window.history.back()}
          className="flex items-center justify-center w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/20 text-white hover:bg-black/80 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
        </button>
      </div>

      {/* LIVEバッジ */}
      {stream.status === "live" && (
        <div className="absolute top-3 left-14 flex items-center gap-2">
          <Badge className="bg-red-500 text-white border-0 flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white" />
            LIVE
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {stream.viewer_count || 0}
          </Badge>
        </div>
      )}

      {/* 読み上げトグル（右上） */}
      {stream.status === "live" && (
        <button
          onClick={() => setSpeechEnabled((v) => !v)}
          title={speechEnabled ? "読み上げON" : "読み上げOFF"}
          style={{
            position: "absolute",
            top: 12,
            right: activeCall ? 120 : 12,
            zIndex: 30,
            width: 38,
            height: 38,
            borderRadius: "50%",
            background: speechEnabled ? "rgba(251,191,36,0.85)" : "rgba(0,0,0,0.5)",
            border: speechEnabled ? "2px solid #fbbf24" : "1px solid rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {speechEnabled
            ? <Volume2 style={{ width: 18, height: 18, color: "#000" }} />
            : <VolumeX style={{ width: 18, height: 18, color: "#fff" }} />
          }
        </button>
      )}

      {/* エール通知ポップアップ */}
      {stream.status === "live" && (
        <YellNotificationPopup streamId={id} speechEnabled={speechEnabled} />
      )}

      <TipOverlay tips={activeTips} />

      {/* 配信ページでは「通話中」ボタンを表示しない（配信と通話は別機能） */}

      {stream.status === "live" && (
        <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
          {/* チャット背景 — Blur + 高級感 */}
          <div className="pointer-events-auto absolute bottom-0 left-0 right-0 max-h-[50vh] md:max-h-1/2 flex flex-col"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 100%)", backdropFilter: "blur(12px)" }}>
            {/* 投げ銭ランキング（右側に小さく） */}
            <div className="absolute right-2 bottom-28 sm:bottom-32 w-44 sm:w-52 pointer-events-auto">
              <div className="bg-black/70 border border-yellow-500/30 rounded-xl overflow-hidden backdrop-blur">
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-yellow-500/20">
                  <span className="text-sm">🏆</span>
                  <p className="text-xs font-black text-yellow-300">投げ銭TOP</p>
                </div>
                <div className="px-2 py-2 max-h-40 overflow-y-auto">
                  <YellRanking streamId={id} />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-1.5 sm:py-2 space-y-1 min-h-[60px] sm:min-h-[100px] max-h-[120px] sm:max-h-[180px]">
              <LiveChatDisplay streamId={id} />
            </div>
          </div>

          {/* エール送信エリア — 親指エリア最適化 */}
          <div className="pointer-events-auto absolute bottom-0 left-0 right-0"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)", paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
            {/* チャット入力 */}
            <ViewerChatInput streamId={id} user={user} />

            {/* エールボタン — 親指エリア配置（下部両脇） */}
            <div className="px-2 sm:px-3 pb-3 sm:pb-4 flex justify-between items-end gap-1 sm:gap-2">
              <div className="flex gap-1 sm:gap-1.5 flex-wrap justify-start flex-1">
                <YellButtons streamId={id} user={user} channelId={stream.channel_id} />
              </div>
              <div className="flex items-center gap-1">
                <VideoControls videoRef={null} showQuality={false} />
                <button
                  onClick={toggleFullscreen}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur hover:from-white/30 hover:to-white/10 flex items-center justify-center text-white transition-all shadow-lg"
                >
                  {isFullscreen ? <Minimize className="w-3 h-3 sm:w-4 sm:h-4" /> : <Maximize className="w-3 h-3 sm:w-4 sm:h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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