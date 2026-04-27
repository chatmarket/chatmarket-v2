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
import { Users, Radio, Lock, CreditCard, Zap, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import VideoControls from "../components/video/VideoControls";
import ViewerStream from "../components/live/ViewerStream.jsx";
import YellButtons from "../components/live/YellButtons.jsx";

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
  const [user, setUser] = useState(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [ticketChecked, setTicketChecked] = useState(false);
  const [activeTips, setActiveTips] = useState([]);
  const [channelOwnerEmail, setChannelOwnerEmail] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [forceKey, setForceKey] = useState(0);
  const extensionNotifiedRef = useRef(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) return;
      base44.auth.me().then(setUser).catch(() => {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create" || event.data?.livestream_id !== id) return;
      const item = { ...event.data, id: event.id };
      if (!item.gift_id) {
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
    setHasPurchased(true);
    setTicketChecked(true);
  }, [stream]);

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
      {/* 有料ペイウォール */}
      {stream.price > 0 && !hasPurchased && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-4 p-4">
          <Lock className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-xl font-bold text-white">有料ライブ配信です</h2>
          <p className="text-3xl font-black text-primary">¥{stream.price?.toLocaleString()}</p>
          {!user ? (
            <Button onClick={() => base44.auth.redirectToLogin()} className="gap-2 h-12">
              <CreditCard className="w-5 h-5" /> ログインして購入
            </Button>
          ) : (
            <Button onClick={handlePurchase} className="gap-2 h-12">
              <Zap className="w-5 h-5" /> 今すぐ購入して視聴する
            </Button>
          )}
        </div>
      )}

      {/* 映像エリア */}
      {stream.status === "live" && ticketChecked && stream.stream_type === "vimeo" && stream.vimeo_url ? (
        <iframe src={stream.vimeo_url} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={stream.title} />
      ) : stream.status === "live" && ticketChecked && stream.stream_type === "youtube" && stream.youtube_url ? (
        <iframe src={stream.youtube_url} className="w-full h-full" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={stream.title} />
      ) : stream.status === "live" ? (
        <ViewerStream key={`${id}-${forceKey}`} streamId={id} stream={stream} />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-secondary">
          <p className="text-muted-foreground">
            {stream.status === "ended" ? "配信は終了しました" : "配信開始をお待ちください"}
          </p>
        </div>
      )}

      {/* LIVEバッジ */}
      {stream.status === "live" && (
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

      <TipOverlay tips={activeTips} />

      {activeCall && (
        <Link to={`/call/${activeCall.id}`}>
          <Button className="absolute top-3 right-3 z-20 bg-green-500 hover:bg-green-600 gap-2 animate-pulse shadow-lg shadow-green-500/50">
            <Radio className="w-4 h-4" />
            通話中
          </Button>
        </Link>
      )}

      {stream.status === "live" && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          {/* エールバー — ゴールドUI */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)",
            }}
          >
            {/* 左: エールボタン */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-start mr-1">
                <span className="text-[10px] font-black text-yellow-400 tracking-widest uppercase">YELL</span>
                <span className="text-[8px] text-yellow-400/60">応援する</span>
              </div>
              <YellButtons streamId={id} user={user} channelId={stream.channel_id} />
            </div>

            {/* 右: 設定・フルスクリーン */}
            <div className="flex items-center gap-2">
              <VideoControls videoRef={null} showQuality={true} />
              <button
                onClick={toggleFullscreen}
                className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );

  return (
    <div className="w-full min-h-screen bg-background">
      <MetaHelmet
        title={`🔴 ${stream.title} | ChatMarket LIVE`}
        description={stream.description || `${stream.channel_name}がライブ配信中！`}
        image={stream.thumbnail_url}
      />
      {videoPortal}
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