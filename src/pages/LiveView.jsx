import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ChatPanel from "../components/chat/ChatPanel.jsx";
import PaywallModal from "../components/video/PaywallModal";
import TipOverlay from "../components/live/TipOverlay";
import TipPanel from "../components/live/TipPanel";
import GiftOverlay from "../components/live/GiftOverlay";
import GiftPanel from "../components/live/GiftPanel";
import CommentSection from "../components/video/CommentSection";
import ReactionBar from "../components/video/ReactionBar";
import RatingSection from "../components/video/RatingSection";
import { Users, Radio, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VideoControls from "../components/video/VideoControls";
import ViewerStream from "../components/live/ViewerStream";
import PpvPreSale from "../components/live/PpvPreSale";

export default function LiveView() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [previewSeconds, setPreviewSeconds] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeTips, setActiveTips] = useState([]);
  const [activeGifts, setActiveGifts] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [channelOwnerEmail, setChannelOwnerEmail] = useState("");

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then((u) => {
        setUser(u);
        base44.entities.YellCoinWallet.filter({ user_email: u.email }).then((r) => setWallet(r[0] || null));
      }).catch(() => {});
    });
  }, []);

  // SuperChat & ギフト リアルタイム購読
  useEffect(() => {
    const unsub = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create" || event.data?.livestream_id !== id) return;
      const item = { ...event.data, id: event.id };

      if (item.gift_id) {
        // ギフト
        setActiveGifts((prev) => [...prev.slice(-4), item]);
        setTimeout(() => setActiveGifts((prev) => prev.filter((g) => g.id !== event.id)), 5000);
      } else {
        // 通常スーパーチャット
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

  // チャンネルオーナーメール取得
  useEffect(() => {
    if (!stream?.channel_id) return;
    base44.entities.Channel.filter({ id: stream.channel_id }).then((r) => {
      if (r[0]?.owner_email) setChannelOwnerEmail(r[0].owner_email);
    });
  }, [stream?.channel_id]);

  // 30秒プレビュータイマー（有料かつ未購入の場合のみ）
  useEffect(() => {
    if (!stream || !stream.price || stream.price === 0 || hasPurchased) return;
    if (stream.status !== "live") return;
    const timer = setInterval(() => {
      setPreviewSeconds(prev => {
        if (prev >= 30) {
          clearInterval(timer);
          setShowPaywall(true);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [stream?.id, stream?.status, hasPurchased]);

  // Check purchase
  useEffect(() => {
    if (!user || !stream) return;
    if (!stream.price || stream.price === 0) {
      setHasPurchased(true);
      return;
    }
    base44.entities.Purchase.filter({
      item_type: "livestream",
      item_id: id,
      buyer_email: user.email,
      status: "completed",
    }).then((purchases) => {
      if (purchases.length > 0) setHasPurchased(true);
    });
  }, [user, stream, id]);

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
  // プレビュー中かどうか（30秒以内は見せる）
  const inPreview = needsPayment && previewSeconds < 30 && !showPaywall;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Stream Player */}
        <div className="space-y-3 sm:space-y-4 lg:col-span-2">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
            {showPaywall && !hasPurchased ? (
              /* ペイウォールオーバーレイ */
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm gap-4 p-4">
                <div className="text-center space-y-2">
                  <Lock className="w-12 h-12 text-primary mx-auto" />
                  <h2 className="text-xl font-bold">30秒プレビューが終了しました</h2>
                  <p className="text-muted-foreground text-sm">続きを視聴するにはチケットを購入してください</p>
                  <p className="text-3xl font-black text-primary">¥{stream.price?.toLocaleString()}</p>
                </div>
                {!user ? (
                  <Button onClick={() => base44.auth.redirectToLogin()} className="bg-primary hover:bg-primary/90 gap-2 h-12 text-base">
                    <CreditCard className="w-5 h-5" /> ログインして購入
                  </Button>
                ) : (
                  <Button onClick={handlePurchase} className="bg-primary hover:bg-primary/90 gap-2 h-12 text-base">
                    <CreditCard className="w-5 h-5" /> チケット購入
                  </Button>
                )}
              </div>
            ) : null}

            {needsPayment && !inPreview && !showPaywall ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-card gap-3 sm:gap-4 p-4">
                <Lock className="w-12 h-12 text-muted-foreground" />
                <h2 className="text-lg sm:text-xl font-bold">有料ライブ配信</h2>
                <p className="text-muted-foreground text-sm">チケットを購入して視聴</p>
                <div className="text-2xl font-bold text-primary">
                  ¥{stream.price?.toLocaleString()}
                </div>
                <Button onClick={handlePurchase} className="bg-primary hover:bg-primary/90 gap-2">
                  <CreditCard className="w-4 h-4" />
                  チケット購入
                </Button>
              </div>
            ) : stream.status === "live" && stream.stream_type === "vimeo" && stream.vimeo_url ? (
              <iframe
                src={stream.vimeo_url}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                title={stream.title}
              />
            ) : stream.status === "live" && stream.stream_type === "youtube" && stream.youtube_url ? (
              <iframe
                src={stream.youtube_url}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={stream.title}
              />
            ) : stream.status === "live" ? (
              <ViewerStream streamId={id} stream={stream} />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <p className="text-muted-foreground">
                  {stream.status === "ended" ? "配信は終了しました" : "配信開始をお待ちください"}
                </p>
              </div>
            )}

            {/* SAMPLE watermark */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <span className="text-white/30 text-6xl font-black" style={{ transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                SAMPLE
              </span>
            </div>

            {/* 30秒プレビューカウントダウン */}
            {inPreview && (
              <div className="absolute top-3 right-3 bg-black/80 text-white px-3 py-1 rounded-full text-xs font-medium z-20">
                プレビュー {30 - previewSeconds}秒
              </div>
            )}

            {/* Live badge */}
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

            {/* スーパーチャット オーバーレイ */}
            {!needsPayment && <TipOverlay tips={activeTips} />}

            {/* ギフト オーバーレイ */}
            {!needsPayment && (
              <GiftOverlay gifts={activeGifts} viewerCount={stream?.viewer_count || 0} />
            )}

            {/* Video controls */}
            {stream.status === "live" && !needsPayment && (
              <div className="absolute bottom-4 right-3">
                <VideoControls videoRef={null} showQuality={true} />
              </div>
            )}
          </div>

          {/* PPV事前チケット販売 */}
          <PpvPreSale stream={stream} user={user} />

          {/* Tip & Gift パネル */}
          {!needsPayment && (
            <div className="space-y-2">
              <GiftPanel
                streamId={id}
                channelId={stream?.channel_id}
                channelOwnerEmail={channelOwnerEmail}
                user={user}
                wallet={wallet}
                onGiftSent={() => base44.entities.YellCoinWallet.filter({ user_email: user?.email }).then((r) => setWallet(r[0] || null))}
              />
              <TipPanel
                streamId={id}
                user={user}
                wallet={wallet}
                onTipSent={() => base44.entities.YellCoinWallet.filter({ user_email: user?.email }).then((r) => setWallet(r[0] || null))}
              />
            </div>
          )}

          {/* Stream info */}
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">{stream.title}</h1>
            <p className="text-sm text-muted-foreground">{stream.channel_name}</p>
            {stream.description && (
              <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50 mt-3 sm:mt-4">
                <p className="text-xs sm:text-sm text-foreground/80 whitespace-pre-wrap">{stream.description}</p>
              </div>
            )}
            {hasPurchased && (
              <div className="space-y-3">
                <RatingSection targetId={id} user={user} />
                <ReactionBar targetType="livestream" targetId={id} user={user} />
                <CommentSection targetType="livestream" targetId={id} user={user} />
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="h-[400px] sm:h-[500px] lg:h-[calc(100vh-8rem)] lg:col-span-1">
          <ChatPanel targetType="livestream" targetId={id} />
        </div>
      </div>
    </div>
  );
}