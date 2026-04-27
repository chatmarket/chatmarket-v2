import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import MetaHelmet from "@/components/layout/MetaHelmet";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ChatPanel from "../components/chat/ChatPanel.jsx";
import TipOverlay from "../components/live/TipOverlay";
import TipPanel from "../components/live/TipPanel";
import GiftPanel from "../components/live/GiftPanel";
import GiftRankingWidget from "../components/live/GiftRankingWidget";
import CommentSection from "../components/video/CommentSection";
import ReactionBar from "../components/video/ReactionBar";
import RatingSection from "../components/video/RatingSection";
import ExtensionNotification from "../components/live/ExtensionNotification";
import ObsConfigDisplay from "../components/live/ObsConfigDisplay";
import { Users, Radio, Lock, CreditCard, Zap, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import VideoControls from "../components/video/VideoControls";
import ViewerStream from "../components/live/ViewerStream";
import PpvPreSale from "../components/live/PpvPreSale";

// ★ エラーバウンダリ（LiveView全体をラップ）
class LiveViewErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err, info) { console.error("[LiveView] Fatal Error:", err, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 99999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", gap: "16px" }}>
          <div style={{ fontSize: "48px" }}>🚨</div>
          <p style={{ color: "#ff4444", fontWeight: "bold", fontSize: "18px", textAlign: "center" }}>LiveViewでエラーが発生しました</p>
          <pre style={{ color: "#ffaaaa", fontSize: "12px", background: "#1a0000", padding: "16px", borderRadius: "8px", maxWidth: "100%", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
            {this.state.error?.message || String(this.state.error)}
            {"\n\n"}
            {this.state.error?.stack?.split("\n").slice(0, 5).join("\n")}
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
  const id = streamId || idParam; // ルートは /live/:streamId
  const [user, setUser] = useState(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [ticketChecked, setTicketChecked] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeTips, setActiveTips] = useState([]);
  const [activeGifts, setActiveGifts] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [channelOwnerEmail, setChannelOwnerEmail] = useState("");
  const [streamTimeSeconds, setStreamTimeSeconds] = useState(0);
  const [showExtensionWarning, setShowExtensionWarning] = useState(false);
  const [showExtensionNotification, setShowExtensionNotification] = useState(false);
  const [extensionUserName, setExtensionUserName] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  // ★ 緊急デバッグ用
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);
  const [forceKey, setForceKey] = useState(0); // ViewerStream強制再マウント用
  const extensionNotifiedRef = useRef(false);
  const playerContainerRef = useRef(null);
  const loadingTimerRef = useRef(null);

  // ★ 画面上にログを追記するヘルパー
  const addLog = (msg) => {
    const ts = new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setDebugLogs(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 20));
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) {
        addLog("👤 未ログイン — ゲストとして処理");
        return;
      }
      base44.auth.me().then((u) => {
        addLog(`👤 ログイン確認: ${u.email}`);
        setUser(u);
        base44.entities.YellCoinWallet.filter({ user_email: u.email }).then((r) => setWallet(r[0] || null));
      }).catch((err) => {
        // 403含む全エラーを「未ログインゲスト」として扱い処理続行
        addLog(`⚠️ auth.me エラー(${err?.response?.status || err?.status || '?'}) → ゲスト扱いで続行`);
        console.warn("[LiveView] auth.me failed, treating as guest:", err?.message);
        // userはnullのまま → ticketCheckがゲスト用フローへ
      });
    }).catch((err) => {
      addLog(`⚠️ isAuthenticated エラー → ゲスト扱いで続行`);
      console.warn("[LiveView] isAuthenticated failed, treating as guest:", err?.message);
    });
  }, []);

  useEffect(() => {
    const unsub = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create" || event.data?.livestream_id !== id) return;
      const item = { ...event.data, id: event.id };

      if (item.gift_id) {
        setActiveGifts((prev) => [...prev.slice(-4), item]);
        setTimeout(() => setActiveGifts((prev) => prev.filter((g) => g.id !== event.id)), 5000);
      } else {
        setActiveTips((prev) => [...prev.slice(-4), item]);
        setTimeout(() => setActiveTips((prev) => prev.filter((t) => t.id !== event.id)), 5000);
      }
    });
    return unsub;
  }, [id]);

  const { data: stream, isLoading } = useQuery({
    queryKey: ["livestream", id],
    queryFn: async () => {
      const streams = await base44.entities.LiveStream.filter({ id });
      return streams[0];
    },
    refetchInterval: 5000,
  });

  // OBS 設定情報取得（stream から直接取得 — 別デバイスからのアクセスに対応）
  const [ivsStreamKey, setIvsStreamKey] = useState("");
  const [ivsIngestEndpoint, setIvsIngestEndpoint] = useState("");

  useEffect(() => {
    if (!stream) return;
    
    // stream エンティティから IVS 情報を取得
    if (stream.ivs_stream_key) setIvsStreamKey(stream.ivs_stream_key);
    if (stream.ivs_ingest_endpoint) setIvsIngestEndpoint(stream.ivs_ingest_endpoint);
  }, [stream]);

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

  // ★ プレビュー機能は一時停止（30秒無料ロジック全廃止）
  // useEffect(() => {
  //   if (!stream || !stream.price || stream.price === 0 || hasPurchased) return;
  //   if (stream.status !== "live") return;
  //   const timer = setInterval(() => {
  //     setPreviewSeconds(prev => {
  //       if (prev >= 30) {
  //         clearInterval(timer);
  //         setShowPaywall(true);
  //         return prev;
  //       }
  //       return prev + 1;
  //     });
  //   }, 1000);
  //   return () => clearInterval(timer);
  // }, [stream?.id, stream?.status, hasPurchased]);

  useEffect(() => {
    if (stream?.status !== "live" || !hasPurchased) return;
    if (!stream?.is_radio_mode) return;
    
    const timer = setInterval(() => {
      setStreamTimeSeconds(prev => {
        const newTime = prev + 1;
        const isFreePhase = newTime <= 900;
        const secondsInCurrentPhase = isFreePhase ? newTime : (newTime - 900) % 3600;
        const phaseTarget = isFreePhase ? 900 : 3600;
        const warningPoint = phaseTarget - 180;
        
        if (secondsInCurrentPhase >= warningPoint && !extensionNotifiedRef.current) {
          extensionNotifiedRef.current = true;
          setShowExtensionWarning(true);
          const remainingTime = isFreePhase ? "無料視聴終了" : "配信終了";
          const costText = "50コインで60分延長";
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⏰ ラジオ配信について', {
              body: `あと3分で${remainingTime}します。${costText}しますか？`,
              icon: 'https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png',
              tag: `stream-${id}`,
              requireInteraction: true,
            });
          }
          toast.info(`⏰ あと3分で${remainingTime}します。${costText}可能です！`, { duration: 10000 });
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stream?.status, stream?.is_radio_mode, hasPurchased, id]);

  // ローディングタイマー（全開放モードでは不要なため無効化）
  // useEffect(() => { ... }, [ticketChecked]);

  // ★ チケット確認ロジック【全開放テストモード: チケット不問で全員視聴可】
  const runTicketCheck = (currentStream, currentUser) => {
    const s = currentStream;
    if (!s) { addLog("⚠️ Stream未取得"); return; }
    addLog("🔓 全開放モード — チケット不問で即解禁");
    setHasPurchased(true);
    setTicketChecked(true);
  };

  useEffect(() => {
    if (!stream) return;
    runTicketCheck(stream, user);
  }, [user, stream, id]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  if (!id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">配信を読み込み中...</p>
        </div>
      </div>
    );
  }

  const handlePurchase = async () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    await base44.entities.Purchase.create({
      item_type: "livestream",
      item_id: id,
      amount: stream.price,
      buyer_email: user.email,
      status: "completed",
    });
    setHasPurchased(true);
    setShowPaywall(false);
    toast.success("チケット購入完了！配信を視聴します🎉");
  };

  const handleExtendStream = async () => {
    if (!user || !wallet) return;
    const extensionCost = 50;
    
    if (wallet.balance < extensionCost) {
      toast.error(`残高不足です。あと${extensionCost - wallet.balance}コイン必要です。`);
      return;
    }
    
    const jasracFee = Math.ceil(extensionCost * 0.03);
    const netAmount = extensionCost - jasracFee;
    const liverShare = Math.round(netAmount * 0.85);
    const platformShare = netAmount - liverShare;
    
    await base44.entities.YellCoinTransaction.create({
      user_email: user.email,
      type: "send",
      amount: extensionCost,
      target_name: stream.channel_name,
      target_id: stream.channel_id,
      message: `ラジオ配信延長（50コイン→60分）`,
      service_type: "superchat",
      service_id: id,
      channel_id: stream.channel_id,
      channel_owner_email: channelOwnerEmail,
    });
    
    await base44.entities.YellCoinWallet.update(wallet.id, {
      balance: wallet.balance - extensionCost,
      total_sent: (wallet.total_sent || 0) + extensionCost,
    });
    
    await base44.entities.Purchase.create({
      item_type: "livestream",
      item_id: id,
      amount: extensionCost,
      buyer_email: user.email,
      status: "completed",
    });
    
    setExtensionUserName(user.full_name || user.email.split("@")[0]);
    setShowExtensionNotification(true);
    setWallet({ ...wallet, balance: wallet.balance - extensionCost });
    setShowExtensionWarning(false);
    extensionNotifiedRef.current = false;
    setStreamTimeSeconds(0);
    
    toast.success(`✨ 配信を50コイン（60分）で延長しました！\n💰 収益：ライバー ${liverShare}コイン | プラットフォーム ${platformShare}コイン | JASRAC ${jasracFee}円`);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse aspect-video bg-secondary rounded-xl" />
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

  const isPaid = stream.price > 0;
  const needsPayment = isPaid && !hasPurchased;

  const videoPortal = ReactDOM.createPortal(
    <div ref={playerContainerRef} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 99999, background: "#000", borderRadius: 0 }}>
            {showPaywall && !hasPurchased ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-4 p-4">
                <div className="text-center space-y-2">
                  <Lock className="w-12 h-12 text-primary mx-auto" />
                  <h2 className="text-xl font-bold">有料ライブ配信です</h2>
                  <p className="text-muted-foreground text-sm">チケットを購入してすぐ視聴開始</p>
                  <p className="text-3xl font-black text-primary">¥{stream.price?.toLocaleString()}</p>
                </div>
                {!user ? (
                  <Button onClick={() => base44.auth.redirectToLogin()} className="bg-primary hover:bg-primary/90 gap-2 h-12 text-base font-bold">
                    <CreditCard className="w-5 h-5" /> ログインして購入
                  </Button>
                ) : (
                  <Button onClick={handlePurchase} className="bg-primary hover:bg-primary/90 gap-2 h-12 text-base font-bold">
                    <Zap className="w-5 h-5" /> 今すぐ購入して視聴する
                  </Button>
                )}
              </div>
            ) : null}

            {stream.status === "live" && ticketChecked && !needsPayment && stream.stream_type === "vimeo" && stream.vimeo_url ? (
              <iframe
                src={stream.vimeo_url}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={stream.title}
              />
            ) : stream.status === "live" && ticketChecked && !needsPayment && stream.stream_type === "youtube" && stream.youtube_url ? (
              <iframe
                src={stream.youtube_url}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={stream.title}
              />
            ) : stream.status === "live" ? (
              /* IVS配信 */
              <ViewerStream key={`${id}-${forceKey}`} streamId={id} stream={stream} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <p className="text-muted-foreground">
                  {stream.status === "ended" ? "配信は終了しました" : "配信開始をお待ちください"}
                </p>
              </div>
            )}

            {needsPayment && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <span className="text-white/30 text-6xl font-black" style={{ transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                  SAMPLE
                </span>
              </div>
            )}


            {stream.status === "live" && !needsPayment && (
              <div className="absolute top-3 left-3 flex items-center gap-2">
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

            {!needsPayment && <TipOverlay tips={activeTips} />}

            {activeCall && (
              <Link to={`/call/${activeCall.id}`}>
                <Button className="absolute top-3 right-3 z-20 bg-green-500 hover:bg-green-600 gap-2 animate-pulse shadow-lg shadow-green-500/50">
                  <Radio className="w-4 h-4" />
                  通話中
                </Button>
              </Link>
            )}

            {stream.status === "live" && (
             <div className="absolute bottom-4 right-3 flex items-center gap-2">
                <VideoControls videoRef={null} showQuality={true} />
                <button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                  title={isFullscreen ? "全画面解除" : "全画面表示"}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* ★ 画面ログパネル（デバッグ用・z-index最大・常時最前面） */}
            {debugLogs.length > 0 && (
              <div
                className="absolute bottom-14 left-2 right-2 max-h-32 overflow-y-auto rounded-lg p-2 pointer-events-none"
                style={{ zIndex: 9999, background: "rgba(0,0,0,0.92)", border: "1px solid rgba(0,255,220,0.5)" }}
              >
                {debugLogs.map((log, i) => (
                  <p key={i} style={{ fontSize: "11px", fontFamily: "monospace", color: "#00ffd0", lineHeight: "1.4", margin: 0 }}>{log}</p>
                ))}
              </div>
            )}
          </div>,
    document.body
  );

  return (
    <div className="w-full min-h-screen bg-background">
      <MetaHelmet
        title={`🔴 ${stream.title} | ChatMarket LIVE`}
        description={stream.description || `${stream.channel_name}がライブ配信中！ChatMarketで今すぐ視聴。`}
        image={stream.thumbnail_url}
      />
      {videoPortal}
      
      {/* OBS 設定パネル - 配信テスト時に表示 */}
      {ivsStreamKey && ivsIngestEndpoint && (
        <ObsConfigDisplay streamKey={ivsStreamKey} ingestEndpoint={ivsIngestEndpoint} />
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