import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Radio, Play, Heart, Target, ExternalLink, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import VideoCard from "../components/cards/VideoCard";
import LiveStreamCard from "../components/cards/LiveStreamCard";
import MessageModal from "../components/chat/MessageModal";
import ScrollRow from "../components/home/ScrollRow";
import CallWaitingRow from "../components/home/CallWaitingRow";
import CreatorRanking from "../components/home/CreatorRanking";
import PwaInstallGuideSection from "../components/home/PwaInstallGuideSection";

export default function Home() {
  const [user, setUser] = useState(null);
  const [messageTarget, setMessageTarget] = useState(null);
  const [cfExpanded, setCfExpanded] = useState(false);

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

  const { data: crowdfundings = [] } = useQuery({
    queryKey: ["crowdfunding-active"],
    queryFn: () => base44.entities.CrowdfundingProject.filter({ status: "active" }, "-created_date", 10),
  });

  const approvedVideos = videos.filter((v) => !v.moderation_status || v.moderation_status === "approved");
  const featuredVideos = approvedVideos.filter((v) => !v.is_free && v.price > 0).slice(0, 8);
  const freeVideos = approvedVideos.filter((v) => v.is_free).slice(0, 8);
  const recentVideos = approvedVideos.slice(0, 8);

  const getChannel = (video) => channels.find((c) => c.id === video.channel_id);

  const handleMessage = (video) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    const channel = getChannel(video);
    if (channel) setMessageTarget({ channel, video });
  };

  const isEmpty = approvedVideos.length === 0 && liveStreams.length === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8 space-y-14">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/40 p-8 md:p-14 text-center"
        style={{ background: "linear-gradient(135deg,#0a0a0f 0%,#12050a 50%,#050a12 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "linear-gradient(#ff3366 1px,transparent 1px),linear-gradient(90deg,#ff3366 1px,transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <div className="relative z-10 max-w-2xl mx-auto">
          <style>{`
            @keyframes neonFlicker{0%,19%,21%,23%,25%,54%,56%,100%{text-shadow:0 0 5px #fff,0 0 10px #fff,0 0 20px #ff3366,0 0 40px #ff3366,0 0 80px #ff3366;color:#fff}20%,24%,55%{text-shadow:none;color:#ff3366}}
            @keyframes neonBlue{0%,29%,31%,100%{text-shadow:0 0 5px #fff,0 0 10px #fff,0 0 20px #00cfff,0 0 40px #00cfff;color:#fff}30%{text-shadow:none;color:#00cfff}}
            .n-chat{animation:neonFlicker 3s infinite alternate;font-family:Georgia,serif;letter-spacing:.15em}
            .n-market{animation:neonBlue 2.5s infinite alternate;font-family:Georgia,serif;letter-spacing:.15em}
            .n-box{box-shadow:0 0 15px #ff3366,0 0 30px #ff3366,inset 0 0 15px rgba(255,51,102,.1);border:2px solid #ff3366}
          `}</style>
          <div className="n-box inline-block rounded-2xl px-8 py-5 mb-6"
            style={{ background: "rgba(0,0,0,.7)", backdropFilter: "blur(10px)" }}>
            <div className="text-4xl md:text-6xl font-black">
              <span className="n-chat">CHAT</span>
              <span className="mx-3 text-white/30 text-2xl">✦</span>
              <span className="n-market">MARKET</span>
            </div>
            <div className="mt-1.5 text-[11px] tracking-[.5em] uppercase" style={{ color: "#ff3366", textShadow: "0 0 10px #ff3366" }}>
              Est. 2024 · The Creator Hub
            </div>
          </div>
          <p className="text-muted-foreground mb-8 text-sm md:text-base leading-relaxed">
            有料ライブ配信・動画販売・1対1有料ビデオ通話を<br />
            このプラットフォーム一つで。使い方は無限大！
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/go-live">
              <Button className="bg-primary hover:bg-primary/90 gap-2 h-11 px-6">
                <Radio className="w-4 h-4" />ライブ配信を始める
              </Button>
            </Link>
            <Link to="/upload">
              <Button variant="secondary" className="gap-2 h-11 px-6">
                <Play className="w-4 h-4" />動画をアップロード
              </Button>
            </Link>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(255,51,102,.15) 0%,transparent 70%)" }} />
      </section>

      {/* 1on1 待機中 */}
      <section>
        <CallWaitingRow user={user} />
      </section>

      {/* ライブ配信中 */}
      {liveStreams.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-xl font-bold">ライブ配信中</h2>
          </div>
          <ScrollRow cardWidth={280}>
            {liveStreams.map((s) => <LiveStreamCard key={s.id} stream={s} />)}
          </ScrollRow>
        </section>
      )}

      {/* おすすめ有料動画 */}
      {featuredVideos.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">おすすめ有料動画</h2>
          <ScrollRow cardWidth={280}>
            {featuredVideos.map((v) => (
              <div key={v.id} className="relative group">
                <VideoCard video={v} />
                <button
                  onClick={() => handleMessage(v)}
                  className="absolute bottom-14 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/90 hover:bg-primary text-primary-foreground text-xs rounded-full px-3 py-1.5 flex items-center gap-1 shadow-lg"
                >
                  <MessageCircle className="w-3.5 h-3.5" />メッセージ
                </button>
              </div>
            ))}
          </ScrollRow>
        </section>
      )}

      {/* 無料動画 */}
      {freeVideos.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">無料で見られる動画</h2>
          <ScrollRow cardWidth={280}>
            {freeVideos.map((v) => (
              <div key={v.id} className="relative group">
                <VideoCard video={v} />
              </div>
            ))}
          </ScrollRow>
        </section>
      )}

      {/* 新着動画 */}
      {recentVideos.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold">新着動画</h2>
          <ScrollRow cardWidth={280}>
            {recentVideos.map((v) => (
              <div key={v.id} className="relative group">
                <VideoCard video={v} />
                <button
                  onClick={() => handleMessage(v)}
                  className="absolute bottom-14 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/90 hover:bg-primary text-primary-foreground text-xs rounded-full px-3 py-1.5 flex items-center gap-1 shadow-lg"
                >
                  <MessageCircle className="w-3.5 h-3.5" />メッセージ
                </button>
              </div>
            ))}
          </ScrollRow>
        </section>
      )}

      {/* クラウドファンディング */}
      {crowdfundings.length > 0 && (
        <section>
          <div
            className="bg-gradient-to-br from-red-900/30 to-red-800/10 border border-red-500/30 rounded-2xl overflow-hidden cursor-pointer"
            onClick={() => setCfExpanded((v) => !v)}
          >
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="font-bold flex items-center gap-2">
                    クラウドファンディング
                    <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">{crowdfundings.length}件</span>
                  </h2>
                  <p className="text-xs text-red-300/70">NPO・社会課題プロジェクトを支援</p>
                </div>
              </div>
              {cfExpanded ? <ChevronUp className="w-5 h-5 text-red-400" /> : <ChevronDown className="w-5 h-5 text-red-400" />}
            </div>
          </div>
          {cfExpanded && (
            <div className="border border-t-0 border-red-500/20 rounded-b-2xl bg-red-950/10 divide-y divide-red-500/10">
              {crowdfundings.map((cf) => {
                const goalPct = cf.goal_amount > 0 ? Math.min(100, Math.round((cf.total_raised / cf.goal_amount) * 100)) : null;
                return (
                  <div key={cf.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="font-bold text-sm line-clamp-1">{cf.title}</p>
                      <p className="text-xs text-muted-foreground">{cf.organization_name}</p>
                      <div className="flex items-center gap-3 text-xs text-red-300">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {cf.supporter_count || 0}人支援</span>
                        <span>¥{(cf.total_raised || 0).toLocaleString()} 累計</span>
                        {goalPct !== null && <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {goalPct}%</span>}
                      </div>
                    </div>
                    <Link to={`/crowdfunding/${cf.id}`} onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white gap-1 shrink-0">
                        支援 <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
              <div className="px-5 py-3 text-center">
                <Link to="/crowdfunding">
                  <button className="text-xs text-red-400 hover:text-red-300 underline">すべて見る →</button>
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* クリエイターランキング */}
      <CreatorRanking />

      {/* 空の状態 */}
      {isEmpty && (
        <div className="text-center py-24 text-muted-foreground">
          <Radio className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">まだコンテンツがありません</p>
          <p className="text-sm mt-1">ライブ配信や動画アップロードで最初の一歩を！</p>
        </div>
      )}

      <PwaInstallGuideSection />

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