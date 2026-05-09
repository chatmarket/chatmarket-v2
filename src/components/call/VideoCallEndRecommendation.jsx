import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import ScrollRow from "@/components/home/ScrollRow";
import VideoCard from "@/components/cards/VideoCard";
import LiveStreamCard from "@/components/cards/LiveStreamCard";

// 相談者のカテゴリから関連カテゴリを推奨
const CATEGORY_RECOMMENDATIONS = {
  "占い": ["スピリチュアル", "人間関係"],
  "教育": ["キャリア", "スキル"],
  "音楽": ["エンタメ", "ライブ"],
  "ゲーム": ["テクノロジー", "クリエイティブ"],
  "キャリア": ["起業", "スキル", "人材育成"],
  "メンタル": ["ウェルネス", "ライフコーチング"],
};

/**
 * VideoCallEndRecommendation
 * 1対1通話終了後に表示される、関連カテゴリ・アドバイザーのレコメンド
 * 
 * Props:
 * - calleeChannel: 通話相手のチャンネル情報
 * - onClose: 閉じるコールバック
 */
export default function VideoCallEndRecommendation({ calleeChannel, onClose }) {
  // Hooksは条件分岐より前に呼ぶ
  const recommendedCategories = useMemo(() => {
    if (!calleeChannel) return [];
    const baseCategories = CATEGORY_RECOMMENDATIONS[calleeChannel.stream_category] || [calleeChannel.stream_category];
    return [...new Set(baseCategories)].slice(0, 3);
  }, [calleeChannel]);

  const { data: relatedStreams = [] } = useQuery({
    queryKey: ["recommendation-streams", recommendedCategories],
    queryFn: async () => {
      const allStreams = await base44.entities.LiveStream.filter({ status: "live" }, "-viewer_count", 15);
      return allStreams
        .filter((s) => recommendedCategories.some((cat) => s.channel_name?.includes(cat) || s.title?.includes(cat)))
        .slice(0, 4);
    },
    enabled: !!calleeChannel && recommendedCategories.length > 0,
  });

  const { data: relatedVideos = [] } = useQuery({
    queryKey: ["recommendation-videos", recommendedCategories],
    queryFn: async () => {
      const allVideos = await base44.entities.Video.list("-view_count", 20);
      return allVideos
        .filter((v) =>
          recommendedCategories.some((cat) => v.channel_name?.includes(cat) || v.title?.includes(cat)) &&
          (!v.moderation_status || v.moderation_status === "approved")
        )
        .slice(0, 6);
    },
    enabled: !!calleeChannel && recommendedCategories.length > 0,
  });

  if (!calleeChannel) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-6 space-y-5"
    >
      {/* ヘッダー */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-black text-base text-foreground">次のステップを見つけよう</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {calleeChannel.name}さんと話した人は、こんなカテゴリも見ています
        </p>
      </div>

      {/* 関連カテゴリタグ */}
      <div className="flex flex-wrap gap-2">
        {recommendedCategories.map((cat) => (
          <Link
            key={cat}
            to={`/search?q=${encodeURIComponent(cat)}`}
            className="text-xs px-3 py-1.5 rounded-full border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold"
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* ライブストリーム */}
      {relatedStreams.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            今、LIVE配信中
          </p>
          <ScrollRow cardWidth={200} mobileCardWidth="48vw">
            {relatedStreams.map((s) => (
              <LiveStreamCard key={s.id} stream={s} />
            ))}
          </ScrollRow>
        </div>
      )}

      {/* 関連ビデオ */}
      {relatedVideos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            人気の動画
          </p>
          <ScrollRow cardWidth={200} mobileCardWidth="48vw">
            {relatedVideos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </ScrollRow>
        </div>
      )}

      {/* 閉じるボタン */}
      <button
        onClick={onClose}
        className="w-full py-2 rounded-lg border border-border/50 text-xs font-bold hover:bg-white/5 transition-colors text-muted-foreground"
      >
        閉じる
      </button>
    </motion.div>
  );
}