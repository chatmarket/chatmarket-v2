import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Radio, Play, Zap } from "lucide-react";
import VideoCard from "../components/cards/VideoCard";
import LiveStreamCard from "../components/cards/LiveStreamCard";

export default function Home() {
  const { data: videos = [] } = useQuery({
    queryKey: ["videos-home"],
    queryFn: () => base44.entities.Video.list("-created_date", 12),
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ["livestreams-home"],
    queryFn: () => base44.entities.LiveStream.filter({ status: "live" }, "-created_date", 8),
  });

  const featuredVideos = videos.filter((v) => v.is_featured);
  const recentVideos = videos.filter((v) => !v.is_featured);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-secondary border border-border/50 p-8 md:p-12">
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-primary text-sm font-semibold tracking-widest uppercase">ChatMarket</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
            プレミアム<br />
            <span className="text-primary">ライブ配信</span>プラットフォーム
          </h1>
          <p className="text-muted-foreground mb-6 text-sm md:text-base">
            有料ライブ配信・動画販売・1対1ビデオ通話をこの一つのプラットフォームで。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/go-live">
              <Button className="bg-primary hover:bg-primary/90 gap-2">
                <Radio className="w-4 h-4" />
                有料ライブ配信を開始
              </Button>
            </Link>
            <Link to="/upload">
              <Button variant="secondary" className="gap-2">
                <Play className="w-4 h-4" />
                動画をアップロード
              </Button>
            </Link>
          </div>
        </div>
        {/* decorative bg glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Live Streams */}
      {liveStreams.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h2 className="text-xl font-bold">ライブ配信中</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {liveStreams.map((stream) => (
              <LiveStreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Videos */}
      {featuredVideos.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-5">おすすめ動画</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredVideos.map((v) => (
              <VideoCard key={v.id} video={v} size="large" />
            ))}
          </div>
        </section>
      )}

      {/* Recent Videos */}
      {recentVideos.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-5">最新動画</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {recentVideos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}

      {videos.length === 0 && liveStreams.length === 0 && (
        <div className="text-center py-24 text-muted-foreground">
          <Radio className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">まだコンテンツがありません</p>
          <p className="text-sm mt-1">最初のライブ配信または動画をアップロードしましょう</p>
        </div>
      )}
    </div>
  );
}