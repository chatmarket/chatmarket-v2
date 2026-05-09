import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Sparkles, Heart } from "lucide-react";
import ScrollRow from "./ScrollRow";
import VideoCard from "../cards/VideoCard";
import LiveStreamCard from "../cards/LiveStreamCard";

// カテゴリ優先度マッピング（閲覧履歴 → 推奨カテゴリ）
const CATEGORY_AFFINITY = {
  "占い": ["占い", "スピリチュアル", "運勢"],
  "教育": ["教育", "スキル", "学習"],
  "音楽": ["音楽", "ライブ", "エンタメ"],
  "ゲーム": ["ゲーム", "エンタメ", "コンテンツ"],
  "料理": ["料理", "ライフスタイル", "グルメ"],
};

export default function PersonalizedCategorySection({ user }) {
  // ユーザーの閲覧履歴を取得
  const { data: watchHistory = [] } = useQuery({
    queryKey: ["watch-history-personal", user?.email],
    queryFn: () => user?.email ? base44.entities.WatchHistory.filter({ user_email: user.email }, "-created_date", 50) : Promise.resolve([]),
    enabled: !!user?.email,
  });

  // 推奨カテゴリを計算
  const recommendedCategories = useMemo(() => {
    if (!watchHistory.length) return [];
    
    // ユーザーがよく見るカテゴリを抽出
    const categoryCount = {};
    watchHistory.forEach((item) => {
      if (item.channel_name) {
        categoryCount[item.channel_name] = (categoryCount[item.channel_name] || 0) + 1;
      }
    });

    // 最もよく見るカテゴリのトップ3から関連カテゴリを集約
    const topCategories = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .flatMap(([cat]) => CATEGORY_AFFINITY[cat] || [cat]);

    return [...new Set(topCategories)].slice(0, 5);
  }, [watchHistory]);

  // Hooksは条件分岐より前に呼ぶ
  const { data: liveStreams = [] } = useQuery({
    queryKey: ["personalized-livestreams", recommendedCategories],
    queryFn: async () => {
      const allStreams = await base44.entities.LiveStream.filter({ status: "live" }, "-created_date", 20);
      return allStreams.filter((s) =>
        recommendedCategories.some((cat) =>
          s.channel_name?.includes(cat) || s.title?.includes(cat)
        )
      ).slice(0, 6);
    },
    enabled: !!user?.email && recommendedCategories.length > 0,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["personalized-videos", recommendedCategories],
    queryFn: async () => {
      const allVideos = await base44.entities.Video.list("-view_count", 30);
      return allVideos.filter((v) =>
        recommendedCategories.some((cat) =>
          v.channel_name?.includes(cat) || v.title?.includes(cat)
        ) && (!v.moderation_status || v.moderation_status === "approved")
      ).slice(0, 8);
    },
    enabled: !!user?.email && recommendedCategories.length > 0,
  });

  if (!user?.email || recommendedCategories.length === 0) return null;

  return (
    <section className="px-0 mb-8 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-4 sm:px-6"
      >
        <Sparkles className="w-4 h-4 text-amber-400" />
        <h2 className="text-sm font-black" style={{ color: "#F5A623" }}>あなタ向けおすすめ</h2>
        <div className="flex gap-1 flex-wrap">
          {recommendedCategories.slice(0, 3).map((cat) => (
            <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold">
              {cat}
            </span>
          ))}
        </div>
      </motion.div>

      {/* ライブストリーム */}
      {liveStreams.length > 0 && (
        <div>
          <div className="px-4 sm:px-6 flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-muted-foreground">あなたの好みのLIVE</span>
          </div>
          <ScrollRow cardWidth={280} mobileCardWidth="72vw">
            {liveStreams.map((s) => (
              <LiveStreamCard key={s.id} stream={s} />
            ))}
          </ScrollRow>
        </div>
      )}

      {/* ビデオ */}
      {videos.length > 0 && (
        <div>
          <div className="px-4 sm:px-6 flex items-center gap-2 mb-2">
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-xs font-bold text-muted-foreground">あなたの好みのビデオ</span>
          </div>
          <ScrollRow cardWidth={280} mobileCardWidth="72vw">
            {videos.map((v) => (
              <div key={v.id} className="relative group">
                <VideoCard video={v} />
              </div>
            ))}
          </ScrollRow>
        </div>
      )}
    </section>
  );
}