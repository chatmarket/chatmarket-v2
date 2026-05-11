import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import MetaHelmet from "@/components/layout/MetaHelmet";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TipOverlay from "../components/live/TipOverlay";
import ExtensionNotification from "../components/live/ExtensionNotification";
import { Volume2, VolumeX, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ViewerStream from "../components/live/ViewerStream.jsx";
import YellButtons from "../components/live/YellButtons.jsx";
import YellNotificationPopup from "../components/live/YellNotificationPopup.jsx";
import InstantKanteiButton from "../components/live/InstantKanteiButton.jsx";
import ViewerChatInput from "../components/live/ViewerChatInput.jsx";
import LiveChatDisplay from "../components/live/LiveChatDisplay.jsx";
import YellCelebrationEffect from "../components/live/YellCelebrationEffect.jsx";
import LiveTicketPurchase from "../components/live/LiveTicketPurchase.jsx";
import LivePaywallStripe from "../components/live/LivePaywallStripe.jsx";
import StreamInfoPanel from "../components/live/StreamInfoPanel.jsx";
import LivePreviewLockout from "../components/live/LivePreviewLockout.jsx";
import ScheduledStreamWaiting from "../components/live/ScheduledStreamWaiting.jsx";
import StreamEndedScreen from "../components/live/StreamEndedScreen.jsx";

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

function useSafeAreaTop() {
  const [safeTop, setSafeTop] = useState(0);
  useEffect(() => {
    const measure = () => {
      const el = document.createElement("div");
      el.style.cssText = "position:fixed;top:env(safe-area-inset-top,0px);left:0;width:1px;height:1px;pointer-events:none;visibility:hidden;";
      document.body.appendChild(el);
      const val = parseInt(window.getComputedStyle(el).top, 10) || 0;
      document.body.removeChild(el);
      setSafeTop(val);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", () => setTimeout(measure, 200));
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);
  return safeTop;
}

// 経過時間カウンター
function useElapsedTime(startedAt) {
  const [elapsed, setElapsed] = useState("00:00:00");
  useEffect(() => {
    if (!startedAt) return;
    const tick = () => {
      const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const h = Math.floor(secs / 3600).toString().padStart(2, "0");
      const m = Math.floor((secs % 3600) / 60).toString().padStart(2, "0");
      const s = (secs % 60).toString().padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed;
}

function LiveViewInner() {
  const { streamId, id: idParam } = useParams();
  const id = streamId || idParam;

  useEffect(() => {
    console.log(`[LiveView] 🔍 URL Param:`, { streamId, idParam, id });
  }, [streamId, idParam, id]);

  const [user, setUser] = useState(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [ticketChecked, setTicketChecked] = useState(false);
  const [coinAllowed, setCoinAllowed] = useState(false);
  const [activeTips, setActiveTips] = useState([]);
  const [channelOwnerEmail, setChannelOwnerEmail] = useState("");
  const [forceKey, setForceKey] = useState(0);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [celebrationYell, setCelebrationYell] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [coinBalance, setCoinBalance] = useState(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const safeTop = useSafeAreaTop();
  const verifiedStreamIdRef = useRef(null);

  // 横縦向き検知
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", () => setTimeout(check, 200));
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) return;
      base44.auth.me().then(u => {
        setUser(u);
        base44.entities.YellCoinWallet.filter({ user_email: u.email })
          .then(w => setCoinBalance(w[0]?.balance ?? 0))
          .catch(() => setCoinBalance(0));
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const unsub = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create") return;
      const effectiveId = verifiedStreamIdRef.current || id;
      const incomingId = event.data?.livestream_id;
      if (incomingId !== effectiveId && incomingId !== id) return;
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
      const streams = await base44.entities.LiveStream.filter({ id });
      const s = streams[0];
      console.log(`[LiveView] 📡 DB fetch:`, { id, status: s?.status, hasUrl: !!s?.ivs_playback_url });
      if (s?.id) verifiedStreamIdRef.current = s.id;
      return s || null;
    },
    refetchInterval: 3000,
    staleTime: 0,
  });

  const elapsed = useElapsedTime(stream?.live_started_at);

  const { data: channel } = useQuery({
    queryKey: ["channel-for-live", stream?.channel_id],
    queryFn: () => base44.entities.Channel.filter({ id: stream.channel_id }).then(r => r[0]),
    enabled: !!stream?.channel_id,
  });

  useEffect(() => {
    if (channel?.owner_email) setChannelOwnerEmail(channel.owner_email);
  }, [channel]);

  useEffect(() => {
    if (!stream) return;
    if (stream.is_ticket_enabled) {
      const purchases = stream.ticket_purchases || [];
      const purchased = user ? purchases.some((p) => p.user_email === user.email) : false;
      setHasPurchased(purchased);
      setTicketChecked(true);
    } else {
      setHasPurchased(true);
      setTicketChecked(true);
    }
  }, [stream?.id, stream?.is_ticket_enabled, user?.email, coinAllowed]);

  if (!id || isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0c0c12" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(16,185,129,0.2)", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!stream) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0c0c12", color: "rgba(255,255,255,0.5)", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 40 }}>📡</span>
        <p>配信が見つかりません</p>
      </div>
    );
  }

  // ── レイアウト定数 ──
  const TOPBAR_H = 52;
  const CHAT_W = isLandscape ? 260 : "100%";

  // 配信終了画面を全画面で表示
  if (stream.status === "ended") {
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: "#0c0c12" }}>
        <MetaHelmet
          title={`配信終了：${stream.channel_name}先生 | Chat Market`}
          description={`${stream.channel_name}先生の配信は終了しました。`}
        />
        <StreamEndedScreen 
          totalYells={stream.ticket_purchases?.length || 0}
          totalViewers={stream.viewer_count || 0}
        />
      </div>
    );
  }

  const videoPortal = ReactDOM.createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#0c0c12",
      display: "flex", flexDirection: "column",
      fontFamily: "'M PLUS Rounded 1c', sans-serif",
    }}>

      {/* ── TOP BAR ── */}
      <div style={{
        paddingTop: safeTop,
        flexShrink: 0,
        background: "#13121c",
        borderBottom: "0.5px solid rgba(255,255,255,0.07)",
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", height: TOPBAR_H }}>
          {/* 左: 戻る + アバター + チャンネル名 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <button
              onClick={() => window.history.back()}
              style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
            </button>
            {/* アバター */}
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: channel?.avatar_url ? "transparent" : "linear-gradient(135deg,#c96b4a,#7c4dff)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              fontSize: 14, fontWeight: 700, color: "#fff",
            }}>
              {channel?.avatar_url
                ? <img src={channel.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (stream.channel_name?.[0] || "L")
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f0eeff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "38vw" }}>
                {stream.channel_name}
              </div>
              {stream.title && (
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "38vw" }}>
                  {stream.title}
                </div>
              )}
            </div>
          </div>

          {/* 右: 視聴者数 + LIVEバッジ + コイン */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {stream.status === "live" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                  <Users style={{ width: 12, height: 12 }} />
                  <span style={{ color: "#f0eeff", fontWeight: 700, fontSize: 13 }}>{(stream.viewer_count || 0).toLocaleString()}</span>
                </div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#e5382a", borderRadius: 4, padding: "3px 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#fff" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", display: "inline-block", animation: "pulseDot 1.4s ease-in-out infinite" }} />
                  LIVE
                </div>
              </div>
            )}
            {user && coinBalance !== null && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 20, padding: "4px 10px" }}>
                <span style={{ fontSize: 12 }}>🪙</span>
                <span style={{ color: "#10b981", fontWeight: 900, fontSize: 12 }}>{coinBalance.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY: 縦=映像上・チャット下 / 横=映像左・チャット右 ── */}
      <div style={{
        flex: 1, minHeight: 0,
        display: "flex",
        flexDirection: isLandscape ? "row" : "column",
        overflow: "hidden",
      }}>

        {/* ── 映像カラム ── */}
        <div style={{
          flex: 1, minWidth: 0, minHeight: 0,
          display: "flex", flexDirection: "column",
          borderRight: isLandscape ? "0.5px solid rgba(255,255,255,0.06)" : "none",
          borderBottom: !isLandscape ? "0.5px solid rgba(255,255,255,0.06)" : "none",
          position: "relative",
        }}>
          {/* 映像ラッパー: 縦向きは16:9固定、横向きはflex-fill */}
          <div style={{
            position: "relative",
            width: "100%",
            ...(isLandscape ? { flex: 1, minHeight: 0 } : stream?.aspect_ratio === "9:16" ? { paddingTop: "177.78%" } : { paddingTop: "56.25%" }),
            background: "#07070e",
            overflow: "hidden",
            transition: "padding-top 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
          }}>
            <div style={isLandscape
              ? { position: "absolute", inset: 0 }
              : { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }
            }>
              {/* ペイウォール */}
              {!stream.is_ticket_enabled && stream.price > 0 && !coinAllowed && (
                <LivePaywallStripe stream={stream} user={user} onAllowed={() => setCoinAllowed(true)} />
              )}
              
              {/* 30秒無料プレビュー → チケット購入オーバーレイ */}
              {stream.is_ticket_enabled && ticketChecked && (
                <LivePreviewLockout
                  stream={stream}
                  user={user}
                  hasPurchased={hasPurchased}
                  onPurchaseClick={() => setShowTicketModal(true)}
                />
              )}

              {/* 配信前の待機画面 */}
              {stream.status === "scheduled" && (
                <ScheduledStreamWaiting stream={stream} viewerCount={stream.viewer_count || 0} />
              )}

              {/* 映像本体 */}
              {stream.status === "live" && ticketChecked && stream.stream_type === "vimeo" && stream.vimeo_url ? (
                <iframe src={stream.vimeo_url} style={{ width: "100%", height: "100%", border: "none" }} allow="autoplay; fullscreen" allowFullScreen title={stream.title} />
              ) : stream.status === "live" && ticketChecked && stream.stream_type === "youtube" && stream.youtube_url ? (
                <iframe src={stream.youtube_url} style={{ width: "100%", height: "100%", border: "none" }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={stream.title} />
              ) : stream.status === "live" && ticketChecked && (stream.price <= 0 || coinAllowed) ? (
                <ViewerStream key={`${id}-${forceKey}`} streamId={id} stream={stream} isMuted={isMuted} onMutedChange={setIsMuted} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#07070e" }}>
                  <div style={{ textAlign: "center", opacity: 0.3 }}>
                    <div style={{ fontSize: 40 }}>📡</div>
                    <p style={{ color: "white", fontSize: 13, marginTop: 8 }}>
                      {stream.status === "ended" ? "配信は終了しました" : "配信開始をお待ちください"}
                    </p>
                  </div>
                </div>
              )}

              {/* 左上オーバーレイ: 経過時間 + 視聴者数 */}
              {stream.status === "live" && (
                <div style={{ position: "absolute", top: 10, left: 10, display: "flex", flexDirection: "column", gap: 5, pointerEvents: "none" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "#ffd980" }}>
                    <Clock style={{ width: 11, height: 11 }} />
                    {elapsed}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "4px 10px", fontSize: 11, color: "rgba(255,255,255,0.8)" }}>
                    <Users style={{ width: 11, height: 11 }} />
                    <strong style={{ color: "#fff" }}>{(stream.viewer_count || 0).toLocaleString()}</strong> 人
                  </span>
                </div>
              )}

              {/* 左下: タイトル */}
              {stream.status === "live" && (
                <div style={{ position: "absolute", bottom: 44, left: 10, pointerEvents: "none" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>{stream.title}</div>
                  {stream.description && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", textShadow: "0 1px 4px rgba(0,0,0,0.8)", marginTop: 2 }}>{stream.channel_name}</div>
                  )}
                </div>
              )}

              {/* ミュートバナー */}
              {isMuted && stream.status === "live" && (
                <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.85)", border: "1px solid rgba(251,191,36,0.5)", borderRadius: 8, padding: "6px 14px", whiteSpace: "nowrap" }}>
                  <VolumeX style={{ width: 13, height: 13, color: "#fbbf24" }} />
                  <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>ミュート中 —</span>
                  <button onClick={() => setIsMuted(false)} style={{ color: "#fbbf24", fontSize: 12, fontWeight: 900, background: "none", border: "none", cursor: "pointer", padding: 0 }}>タップして音声ON</button>
                </div>
              )}
            </div>
          </div>

          {/* コントロールバー（映像直下）*/}
          {stream.status === "live" && (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: "#0f0f18", borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* 音量 */}
                <button onClick={() => setIsMuted(v => !v)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "0.5px solid rgba(255,255,255,0.14)", borderRadius: 6, color: isMuted ? "#fbbf24" : "rgba(255,255,255,0.7)", padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
                  {isMuted ? <VolumeX style={{ width: 13, height: 13 }} /> : <Volume2 style={{ width: 13, height: 13 }} />}
                </button>
                {/* 読み上げ */}
                <button onClick={() => setSpeechEnabled(v => !v)} style={{ display: "flex", alignItems: "center", gap: 4, background: speechEnabled ? "rgba(251,191,36,0.15)" : "none", border: `0.5px solid ${speechEnabled ? "rgba(251,191,36,0.5)" : "rgba(255,255,255,0.14)"}`, borderRadius: 6, color: speechEnabled ? "#fbbf24" : "rgba(255,255,255,0.7)", padding: "5px 10px", fontSize: 11, cursor: "pointer" }}>
                  🔊 読み上げ
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <InstantKanteiButton streamId={stream.id} user={user} channelId={stream.channel_id} channelOwnerEmail={channelOwnerEmail} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {stream.max_bitrate_restriction || "HD"}
                </span>
              </div>
            </div>
          )}

          {/* StreamInfoPanel（縦向きのみ映像下に表示） */}
          {!isLandscape && <StreamInfoPanel stream={stream} />}
        </div>

        {/* ── チャットカラム（配信中のみ表示） ── */}
        {stream.status === "live" && (
           <div style={{
             width: isLandscape ? CHAT_W : "100%",
             flexShrink: 0,
             display: "flex",
             flexDirection: "column",
             background: "#0f0e17",
             ...(isLandscape ? { height: "100%" } : { flex: 1, minHeight: 0 }),
             overflow: "hidden",
           }}>
             {/* チャットヘッダー */}
             <div style={{ padding: "8px 12px 7px", borderBottom: "0.5px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
               <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "rgba(255,255,255,0.5)" }}>LIVE CHAT</span>
               {user && coinBalance !== null && (
                 <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>🪙 {coinBalance.toLocaleString()}</span>
               )}
             </div>

             {/* メッセージ一覧（チケット未購入でも表示） */}
             <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
               <LiveChatDisplay streamId={stream.id} />
             </div>

             {/* エールコインボタン（チケット未購入でも送信可能） */}
             <div style={{ flexShrink: 0, borderTop: "0.5px solid rgba(255,255,255,0.06)", padding: "7px 10px 5px" }}>
               <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 5, letterSpacing: "0.03em" }}>SUPER CHAT</div>
               <YellButtons streamId={stream.id} user={user} channelId={stream.channel_id} compact={true} />
             </div>

             {/* チャット入力 */}
             <div style={{
               flexShrink: 0,
               borderTop: "0.5px solid rgba(255,255,255,0.06)",
               padding: "7px 10px",
               paddingBottom: `max(10px, env(safe-area-inset-bottom, 10px))`,
             }}>
               <ViewerChatInput streamId={stream.id} user={user} />
             </div>
             </div>
             )}
             </div>

      {/* エール通知 */}
      {stream.status === "live" && (
        <YellNotificationPopup streamId={stream.id} speechEnabled={speechEnabled} />
      )}
      <TipOverlay tips={activeTips} />

      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
    </div>,
    document.body
  );

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#0c0c12" }}>
      <MetaHelmet
        title={`🔴 ライブ中：${stream.channel_name}先生 | ${stream.title} | Chat Market`}
        description={stream.description || `${stream.channel_name}先生が今まさに鑑定中！Chat Marketでライブ視聴・エール送信できます。`}
        image={stream.thumbnail_url || stream.channel_avatar || "https://chatmarket.info/og-image.png"}
      />
      {videoPortal}
      {celebrationYell && <YellCelebrationEffect yell={celebrationYell} onComplete={() => setCelebrationYell(null)} />}
      {stream && user && showTicketModal && (
        <LiveTicketPurchase
          stream={stream}
          user={user}
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          onPurchaseSuccess={() => { setHasPurchased(true); setShowTicketModal(false); }}
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