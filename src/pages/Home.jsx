import React, { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "../components/cards/VideoCard";
import LiveStreamCard from "../components/cards/LiveStreamCard";
import { Radio, TrendingUp, Sparkles, Zap, Shield, Coins, Video, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Animated grid background
function GridBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(160 84% 39%) 1px, transparent 1px), linear-gradient(90deg, hsl(160 84% 39%) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </div>
  );
}

// Glowing orb
function Orb({ className }) {
  return (
    <div className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`} />
  );
}

export default function Home() {
  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["featured-videos"],
    queryFn: () => base44.entities.Video.list("-created_date", 20),
  });

  const { data: liveStreams = [], isLoading: loadingLive } = useQuery({
    queryKey: ["live-streams"],
    queryFn: () => base44.entities.LiveStream.filter({ status: "live" }, "-created_date", 10),
  });

  const shuffled = [...videos].sort(() => Math.random() - 0.5);
  const featured = shuffled.slice(0, 4);
  const recommended = shuffled.slice(4);

  return (
    <div className="min-h-screen">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden min-h-[560px] flex items-center">
        <GridBg />
        <Orb className="w-[600px] h-[600px] bg-primary/8 top-[-200px] left-[-100px]" />
        <Orb className="w-[400px] h-[400px] bg-primary/5 bottom-[-100px] right-[10%]" />

        {/* Scan line animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-[scan_4s_ease-in-out_infinite]" style={{ top: "40%" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-24 w-full">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            className="max-w-3xl mx-auto text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-8 border border-primary/30 bg-primary/5 text-primary"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Next-Gen Streaming Platform
            </motion.div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-6">
              <span className="block text-foreground">Chat</span>
              <span
                className="block text-primary relative"
                style={{
                  textShadow: "0 0 40px hsl(160 84% 39% / 0.5), 0 0 80px hsl(160 84% 39% / 0.2)",
                }}
              >
                Market
                {/* Glitch line */}
                <span className="absolute left-0 right-0 top-0 opacity-10 text-primary blur-[2px] select-none">Market</span>
              </span>
            </h1>

            <p className="text-muted-foreground text-lg md:text-xl leading-relaxed mb-10 max-w-xl mx-auto">
              有料ライブ配信・動画販売・エールコイン・ビデオ通話<br />
              <span className="text-primary/70">次世代クリエイタープラットフォーム</span>
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <Link to="/go-live">
                <Button className="gap-2 bg-primary hover:bg-primary/90 h-11 px-6 text-sm font-semibold shadow-[0_0_20px_hsl(160_84%_39%/0.3)]">
                  <Radio className="w-4 h-4" />
                  有料ライブ配信を始める
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/upload">
                <Button variant="outline" className="gap-2 h-11 px-6 text-sm font-semibold border-border/60 hover:border-primary/40 hover:bg-primary/5">
                  <Video className="w-4 h-4" />
                  動画をアップロード
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap justify-center gap-4 mt-16"
          >
            {[
              { icon: <Coins className="w-4 h-4" />, label: "エールコイン" },
              { icon: <Video className="w-4 h-4" />, label: "1対1ビデオ通話" },
              { icon: <Shield className="w-4 h-4" />, label: "ブロック・通報" },
              { icon: <Zap className="w-4 h-4" />, label: "サブスク ¥3,000" },
              { icon: <Radio className="w-4 h-4" />, label: "有料ライブ配信" },
            ].map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/40 bg-card/50 backdrop-blur-sm text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
              >
                <span className="text-primary">{f.icon}</span>
                {f.label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── LIVE NOW ── */}
      {liveStreams.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-14">
          <SectionHeader
            icon={<Radio className="w-4 h-4 animate-pulse" />}
            label="LIVE NOW"
            accent="red"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {liveStreams.map((stream, i) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <LiveStreamCard stream={stream} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── FEATURED ── */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-14">
          <SectionHeader
            icon={<TrendingUp className="w-4 h-4" />}
            label="注目の動画"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <VideoCard video={video} size="large" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ── RECOMMENDED ── */}
      {recommended.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-24">
          <SectionHeader
            icon={<Sparkles className="w-4 h-4" />}
            label="おすすめ"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {recommended.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <VideoCard video={video} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loadingVideos && !loadingLive && videos.length === 0 && liveStreams.length === 0 && (
        <div className="text-center py-32 px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Radio className="w-9 h-9 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">コンテンツがまだありません</h2>
          <p className="text-muted-foreground">最初の動画をアップロードまたは有料ライブ配信を始めましょう</p>
        </div>
      )}

      {/* Loading */}
      {(loadingVideos || loadingLive) && (
        <div className="max-w-7xl mx-auto px-4 pb-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-video bg-secondary rounded-xl" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4" />
                  <div className="h-3 bg-secondary rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon, label, accent = "primary" }) {
  const colors = accent === "red"
    ? "bg-red-500/10 text-red-400 border-red-500/20"
    : "bg-primary/10 text-primary border-primary/20";
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold tracking-wider ${colors}`}>
        {icon}
        {label}
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
    </div>
  );
}