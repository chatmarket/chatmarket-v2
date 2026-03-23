import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "../components/cards/VideoCard";
import LiveStreamCard from "../components/cards/LiveStreamCard";
import { Radio, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

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
  const shuffledLive = [...liveStreams].sort(() => Math.random() - 0.5);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-primary/3 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              クリエイターのための配信プラットフォーム
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
              Chat<span className="text-primary">Market</span>
            </h1>
            <p className="mt-4 text-muted-foreground text-lg">
              ライブ配信・動画販売・スーパーチャット
            </p>
          </motion.div>
        </div>
      </section>

      {/* Live Now */}
      {shuffledLive.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full">
              <Radio className="w-4 h-4 animate-pulse" />
              <span className="text-sm font-bold">LIVE NOW</span>
            </div>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {shuffledLive.map((stream, i) => (
              <motion.div
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <LiveStreamCard stream={stream} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="w-5 h-5" />
              <h2 className="text-lg font-bold">注目の動画</h2>
            </div>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <VideoCard video={video} size="large" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Recommended */}
      {recommended.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 pb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 text-foreground">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">おすすめ</h2>
            </div>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {recommended.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <VideoCard video={video} />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loadingVideos && !loadingLive && videos.length === 0 && liveStreams.length === 0 && (
        <div className="text-center py-24 px-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Radio className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">コンテンツがまだありません</h2>
          <p className="text-muted-foreground">最初の動画をアップロードまたはライブ配信を始めましょう</p>
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