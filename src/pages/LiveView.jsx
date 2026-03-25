import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ChatPanel from "../components/chat/ChatPanel";
import PaywallModal from "../components/video/PaywallModal";
import { Users, Radio, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VideoControls from "../components/video/VideoControls";

export default function LiveView() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: stream, isLoading } = useQuery({
    queryKey: ["livestream", id],
    queryFn: async () => {
      const streams = await base44.entities.LiveStream.filter({ id });
      return streams[0];
    },
    refetchInterval: 5000,
  });

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stream Player */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
            {needsPayment ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-secondary to-card gap-4">
                <Lock className="w-12 h-12 text-muted-foreground" />
                <h2 className="text-xl font-bold">有料ライブ配信</h2>
                <p className="text-muted-foreground text-sm">チケットを購入して視聴</p>
                <div className="text-2xl font-bold text-primary">
                  ¥{stream.price?.toLocaleString()}
                </div>
                <Button onClick={handlePurchase} className="bg-primary hover:bg-primary/90 gap-2">
                  <CreditCard className="w-4 h-4" />
                  チケット購入
                </Button>
              </div>
            ) : stream.status === "live" ? (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-card">
                <div className="text-center space-y-4">
                  <Radio className="w-16 h-16 text-red-400 mx-auto animate-pulse" />
                  <p className="text-lg font-semibold">ライブ配信中</p>
                  <p className="text-sm text-muted-foreground">配信映像はここに表示されます</p>
                </div>
              </div>
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

            {/* Video controls */}
            {stream.status === "live" && !needsPayment && (
              <div className="absolute bottom-4 right-3">
                <VideoControls videoRef={null} showQuality={true} />
              </div>
            )}
          </div>

          {/* Stream info */}
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-bold">{stream.title}</h1>
            <p className="text-sm text-muted-foreground">{stream.channel_name}</p>
            {stream.description && (
              <div className="bg-card rounded-xl p-4 border border-border/50 mt-4">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{stream.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-1 h-[500px] lg:h-[calc(100vh-8rem)]">
          <ChatPanel targetType="livestream" targetId={id} />
        </div>
      </div>
    </div>
  );
}