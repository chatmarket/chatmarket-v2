import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Radio, Play, Zap, MessageCircle } from "lucide-react";
import VideoCard from "../components/cards/VideoCard";
import LiveStreamCard from "../components/cards/LiveStreamCard";
import MessageModal from "../components/chat/MessageModal";
import { t } from "@/lib/i18n";
import PlanSection from "../components/home/PlanSection";
import RevenueBanner from "../components/home/RevenueBanner";
import ScrollRow from "../components/home/ScrollRow";
import PwaInstallGuide from "../components/home/PwaInstallGuide";
import ProgressiveIncentiveSection from "../components/home/ProgressiveIncentiveSection";

export default function Home() {
  const [user, setUser] = useState(null);
  const [messageTarget, setMessageTarget] = useState(null); // { channel, video }

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: videos = [] } = useQuery({
    queryKey: ["videos-home"],
    queryFn: () => base44.entities.Video.list("-created_date", 30),
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels-all"],
    queryFn: () => base44.entities.Channel.list(),
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ["livestreams-home"],
    queryFn: () => base44.entities.LiveStream.filter({ status: "live" }, "-created_date", 6),
  });

  const featuredVideos = videos.filter((v) => !v.is_free && v.price > 0).slice(0, 6);
  const lowViewPaidVideos = videos
    .filter((v) => !v.is_free && v.price > 0)
    .sort((a, b) => (a.view_count || 0) - (b.view_count || 0))
    .slice(0, 6);
  const recentVideos = videos.slice(0, 6);

  const getChannelForVideo = (video) => {
    return channels.find((c) => c.id === video.channel_id);
  };

  const handleVideoMessage = (video) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    const channel = getChannelForVideo(video);
    if (channel) setMessageTarget({ channel, video });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* 準備中バナー */}
      <div className="rounded-2xl bg-yellow-500/10 border border-yellow-500/40 px-6 py-5 text-center space-y-1">
        <p className="text-yellow-300 font-black text-xl">🚧 現在準備中です 🚧</p>
        <p className="text-yellow-200/70 text-sm">サービスは現在準備中です。近日公開予定ですので、今しばらくお待ちください。</p>
      </div>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-secondary border border-border/50 p-8 md:p-12">
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-primary text-sm font-semibold tracking-widest uppercase">ChatMarket</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
            {t("hero_title")}
          </h1>
          <p className="text-muted-foreground mb-6 text-sm md:text-base leading-relaxed">
            有料ライブ配信・動画販売・1対1有料ビデオ通話を<br />
            このプラットフォーム一つで！<br />
            使い方は貴方次第で無限大！
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/go-live">
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                <Radio className="w-4 h-4" />
                {t("startLive")}
              </Button>
            </Link>
            <Link to="/upload">
              <Button variant="secondary" className="gap-2">
                <Play className="w-4 h-4" />
                {t("uploadVideo")}
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Revenue Banner */}
      <RevenueBanner />

      {/* Live Streams */}
      {liveStreams.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-xl font-bold">{t("liveNow")}</h2>
          </div>
          <ScrollRow cardWidth={280}>
            {liveStreams.map((stream) => (
              <LiveStreamCard key={stream.id} stream={stream} />
            ))}
          </ScrollRow>
        </section>
      )}

      {/* Recommended paid videos */}
      {featuredVideos.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-5">{t("recommended")}</h2>
          <ScrollRow cardWidth={280}>
            {featuredVideos.map((v) => (
              <div key={v.id} className="relative group">
                <VideoCard video={v} />
                <button
                  onClick={() => handleVideoMessage(v)}
                  className="absolute bottom-14 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/90 hover:bg-primary text-primary-foreground text-xs rounded-full px-3 py-1.5 flex items-center gap-1 shadow-lg"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {t("sendMessage")}
                </button>
              </div>
            ))}
          </ScrollRow>
        </section>
      )}

      {/* Low-view paid videos */}
      {lowViewPaidVideos.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-2">注目の有料動画（再生数が少ない穴場）</h2>
          <p className="text-sm text-muted-foreground mb-5">まだあまり見られていない希少コンテンツ</p>
          <ScrollRow cardWidth={280}>
            {lowViewPaidVideos.map((v) => (
              <div key={v.id} className="relative group">
                <VideoCard video={v} />
                <button
                  onClick={() => handleVideoMessage(v)}
                  className="absolute bottom-14 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/90 hover:bg-primary text-primary-foreground text-xs rounded-full px-3 py-1.5 flex items-center gap-1 shadow-lg"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {t("sendMessage")}
                </button>
              </div>
            ))}
          </ScrollRow>
        </section>
      )}

      {/* Recent Videos */}
      {recentVideos.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-5">{t("newest")}</h2>
          <ScrollRow cardWidth={280}>
            {recentVideos.map((v) => (
              <div key={v.id} className="relative group">
                <VideoCard video={v} />
                <button
                  onClick={() => handleVideoMessage(v)}
                  className="absolute bottom-14 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/90 hover:bg-primary text-primary-foreground text-xs rounded-full px-3 py-1.5 flex items-center gap-1 shadow-lg"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {t("sendMessage")}
                </button>
              </div>
            ))}
          </ScrollRow>
        </section>
      )}

      {/* Plans */}
      <PlanSection />

      {/* PWA Install Guide */}
      <PwaInstallGuide />

      {/* Progressive Incentive */}
      <ProgressiveIncentiveSection />

      {videos.length === 0 && liveStreams.length === 0 && (
        <div className="text-center py-24 text-muted-foreground">
          <Radio className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">{t("noContent")}</p>
          <p className="text-sm mt-1">{t("noContentSub")}</p>
        </div>
      )}

      {/* Message Modal */}
      {messageTarget && (
        <MessageModal
          channel={messageTarget.channel}
          video={messageTarget.video}
          user={user}
          onClose={() => setMessageTarget(null)}
        />
      )}
    </div>
  );
}