import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Radio, Play, Heart, ExternalLink, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import VideoCard from "../components/cards/VideoCard";
import LiveStreamCard from "../components/cards/LiveStreamCard";
import MessageModal from "../components/chat/MessageModal";
import ScrollRow from "../components/home/ScrollRow";
import CallWaitingRow from "../components/home/CallWaitingRow";
import CreatorRanking from "../components/home/CreatorRanking";
import PwaInstallGuideSection from "../components/home/PwaInstallGuideSection";
import ProgressiveIncentiveSection from "../components/home/ProgressiveIncentiveSection";
import ServerLimitBanner from "../components/home/ServerLimitBanner";

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
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-3 md:px-4 lg:px-8 py-4 sm:py-6 md:py-8 space-y-8 sm:space-y-10 md:space-y-12 lg:space-y-14 overflow-x-hidden">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border border-border/40 text-center" style={{ background: "linear-gradient(135deg,#0a0a0f 0%,#12050a 50%,#050a12 100%)" }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(#ff3366 1px,transparent 1px),linear-gradient(90deg,#ff3366 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="relative z-10 px-4 py-8 sm:py-12 md:py-16">
          <style>{`
            @keyframes neonFlicker{0%,19%,21%,23%,25%,54%,56%,100%{text-shadow:0 0 5px #fff,0 0 10px #fff,0 0 20px #ff3366,0 0 40px #ff3366;color:#fff}20%,24%,55%{text-shadow:none;color:#ff3366}}
            @keyframes neonBlue{0%,29%,31%,100%{text-shadow:0 0 5px #fff,0 0 10px #fff,0 0 20px #00cfff,0 0 40px #00cfff;color:#fff}30%{text-shadow:none;color:#00cfff}}
            .n-chat{animation:neonFlicker 3s infinite alternate;font-family:Georgia,serif;letter-spacing:.15em}
            .n-market{animation:neonBlue 2.5s infinite alternate;font-family:Georgia,serif;letter-spacing:.15em}
          `}</style>

          <div className="flex flex-col items-center gap-3 mb-4 w-full">
            <div className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-none">
              <span className="n-chat" style={{ padding: "12px 24px", borderRadius: "12px", textShadow: "0 0 5px #fff,0 0 10px #fff,0 0 20px #ff3366,0 0 40px #ff3366", color: "#fff" }}>CHAT</span>
              <span className="mx-2 text-white/30">✦</span>
              <span className="n-market" style={{ padding: "12px 24px", borderRadius: "12px", background: "rgba(0,0,255,.1)", boxShadow: "0 0 15px #00cfff, inset 0 0 15px rgba(0,207,255,.1)" }}>MARKET</span>
            </div>
            <p style={{ color: "#ff3366", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", textAlign: "center", width: "100%", marginTop: "-4px" }}>Est. 2026 · The Creator Hub</p>
          </div>

          <p className="text-muted-foreground mb-4 text-xs sm:text-sm leading-relaxed">
            有料ライブ配信・動画販売・1対1有料ビデオ通話を<br className="hidden sm:inline" />
            このプラットフォーム一つで。使い方は無限大！
          </p>

          <div className="mx-auto max-w-sm border border-primary/30 rounded-xl bg-primary/5 px-3 py-2.5 space-y-1.5 text-left mb-5">
            <div className="space-y-0.5">
              <p className="text-[11px] text-foreground/80 leading-relaxed">言論の自由を体感してください、法的な問題発言以外は当サイトにおいて規制はかけません</p>
              <p className="text-[10px] text-muted-foreground">＊配信者が設定するNGワードがありますので、配信者は安心して配信に集中できます</p>
            </div>
            <div className="border-t border-primary/20 pt-1.5 space-y-0.5">
              <p className="text-[11px] text-foreground/80 leading-relaxed">Experience free speech. No restrictions apply here, except for illegal remarks.</p>
              <p className="text-[10px] text-muted-foreground">*Streamers can filter out specific words, so they can stream safely.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
            <Link to="/go-live" className="w-full sm:w-auto">
              <Button className="bg-primary hover:bg-primary/90 gap-2 h-10 px-5 w-full text-sm">
                <Radio className="w-4 h-4" />ライブ配信を始める
              </Button>
            </Link>
            <Link to="/upload" className="w-full sm:w-auto">
              <Button variant="secondary" className="gap-2 h-10 px-5 w-full text-sm">
                <Play className="w-4 h-4" />動画をアップロード
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* サーバー安定化バナー */}
      <div className="px-0">
        <ServerLimitBanner />
      </div>

      {/* 1on1 待機中 */}
      <section className="px-0">
        <CallWaitingRow user={user} />
      </section>

      {/* ライブ配信中 */}
      {liveStreams.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <h2 className="text-base sm:text-lg font-bold">ライブ配信中</h2>
            <span className="text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded-full px-2 py-0.5 font-semibold">LIVE</span>
          </div>
          <ScrollRow cardWidth={280} mobileCardWidth="72vw">
            {liveStreams.map((s) => <LiveStreamCard key={s.id} stream={s} />)}
          </ScrollRow>
        </section>
      )}

      {/* おすすめ有料動画 */}
      {featuredVideos.length > 0 && (
        <section className="space-y-3 px-0">
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-yellow-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold">おすすめ有料動画</h2>
            <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-2 py-0.5 font-semibold">PPV</span>
          </div>
          <ScrollRow cardWidth={280} mobileCardWidth="72vw">
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
        <section className="space-y-3 px-0">
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-primary shrink-0" />
            <h2 className="text-base sm:text-lg font-bold">無料で見られる動画</h2>
            <span className="text-xs text-primary bg-primary/10 border border-primary/30 rounded-full px-2 py-0.5 font-semibold">FREE</span>
          </div>
          <ScrollRow cardWidth={280} mobileCardWidth="72vw">
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
        <section className="space-y-3 px-0">
          <div className="flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-blue-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold">新着動画</h2>
            <span className="text-xs text-blue-400 bg-blue-400/10 border border-blue-400/30 rounded-full px-2 py-0.5 font-semibold">NEW</span>
          </div>
          <ScrollRow cardWidth={280} mobileCardWidth="72vw">
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
        <section className="px-0">
          <div
            className="bg-gradient-to-br from-red-900/30 to-red-800/10 border border-red-500/30 rounded-2xl overflow-hidden cursor-pointer"
            onClick={() => setCfExpanded((v) => !v)}
          >
            <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 md:w-10 sm:h-9 md:h-10 rounded-lg sm:rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-xs sm:text-sm md:text-base flex items-center gap-1 sm:gap-2">
                    クラウドファンディング
                    <span className="text-[10px] sm:text-xs font-bold bg-red-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full">{crowdfundings.length}件</span>
                  </h2>
                  <p className="text-[10px] sm:text-xs text-red-300/70 hidden sm:block">NPO・社会課題プロジェクトを支援</p>
                </div>
              </div>
              {cfExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0" />}
            </div>
          </div>
          {cfExpanded && (
            <div className="border border-t-0 border-red-500/20 rounded-b-lg sm:rounded-b-2xl bg-red-950/10 divide-y divide-red-500/10">
              {crowdfundings.map((cf) => {
                const goalPct = cf.goal_amount > 0 ? Math.min(100, Math.round((cf.total_raised / cf.goal_amount) * 100)) : null;
                return (
                  <div key={cf.id} className="px-3 sm:px-4 md:px-5 py-2 sm:py-3 md:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                      <p className="font-bold text-xs sm:text-sm line-clamp-1">{cf.title}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{cf.organization_name}</p>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-red-300">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {cf.supporter_count || 0}人</span>
                        <span>¥{(cf.total_raised || 0).toLocaleString()}</span>
                        {goalPct !== null && <span>{goalPct}%達成</span>}
                      </div>
                    </div>
                    <Link to={`/crowdfunding/${cf.id}`} onClick={(e) => e.stopPropagation()} className="w-full sm:w-auto">
                      <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white gap-1 shrink-0 text-xs px-3 w-full sm:w-auto">
                        支援 <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
              <div className="px-3 sm:px-4 md:px-5 py-2 sm:py-3 text-center">
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
        <div className="text-center py-12 sm:py-16 md:py-20 lg:py-24 text-muted-foreground px-4">
          <Radio className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-base sm:text-lg">まだコンテンツがありません</p>
          <p className="text-xs sm:text-sm mt-1 sm:mt-2">ライブ配信や動画アップロードで最初の一歩を！</p>
        </div>
      )}

      <div className="px-0">
        <ProgressiveIncentiveSection />
      </div>

      <div className="px-0">
        <PwaInstallGuideSection />
      </div>

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