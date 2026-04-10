import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Trophy, Users, Video, TrendingUp, Crown } from "lucide-react";
import { getCategoryById } from "@/lib/categories";

const TABS = [
  { key: "followers", label: "フォロワー数", icon: Users },
  { key: "videos", label: "動画数", icon: Video },
  { key: "revenue", label: "収益額", icon: TrendingUp },
];

const RANK_COLORS = [
  "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  "text-slate-300 bg-slate-300/10 border-slate-300/30",
  "text-amber-600 bg-amber-600/10 border-amber-600/30",
];

export default function CreatorRanking() {
  const [activeTab, setActiveTab] = useState("followers");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: channels = [] } = useQuery({
    queryKey: ["ranking-channels"],
    queryFn: () => base44.entities.Channel.list(),
  });

  const { data: follows = [] } = useQuery({
    queryKey: ["ranking-follows"],
    queryFn: () => base44.entities.ChannelFollow.list(),
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["ranking-videos"],
    queryFn: () => base44.entities.Video.list(),
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["ranking-purchases"],
    queryFn: () => base44.entities.Purchase.list(),
  });

  // フォロワー数を集計
  const followerMap = follows.reduce((acc, f) => {
    acc[f.channel_id] = (acc[f.channel_id] || 0) + 1;
    return acc;
  }, {});

  // 動画数を集計
  const videoMap = videos.reduce((acc, v) => {
    acc[v.channel_id] = (acc[v.channel_id] || 0) + 1;
    return acc;
  }, {});

  // 収益額を集計
  const revenueMap = purchases.reduce((acc, p) => {
    const channelId = p.channel_id || p.seller_channel_id;
    if (channelId) acc[channelId] = (acc[channelId] || 0) + (p.amount || 0);
    return acc;
  }, {});

  // カテゴリー一覧
  const categories = ["all", ...Array.from(new Set(channels.map((c) => c.category_id).filter(Boolean)))];

  const filteredChannels = selectedCategory === "all"
    ? channels
    : channels.filter((c) => c.category_id === selectedCategory);

  const rankedChannels = [...filteredChannels]
    .sort((a, b) => {
      if (activeTab === "followers") return (followerMap[b.id] || 0) - (followerMap[a.id] || 0);
      if (activeTab === "videos") return (videoMap[b.id] || 0) - (videoMap[a.id] || 0);
      if (activeTab === "revenue") return (revenueMap[b.id] || 0) - (revenueMap[a.id] || 0);
      return 0;
    })
    .slice(0, 10);

  const getScore = (channel) => {
    if (activeTab === "followers") return `${(followerMap[channel.id] || 0).toLocaleString()} フォロワー`;
    if (activeTab === "videos") return `${(videoMap[channel.id] || 0).toLocaleString()} 動画`;
    if (activeTab === "revenue") return `¥${(revenueMap[channel.id] || 0).toLocaleString()}`;
    return "";
  };

  if (rankedChannels.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h2 className="text-xl font-bold">注目配信者ランキング</h2>
      </div>

      {/* タブ */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* カテゴリーフィルター */}
      {categories.length > 2 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((catId) => {
            const cat = catId === "all" ? null : getCategoryById(catId);
            return (
              <button
                key={catId}
                onClick={() => setSelectedCategory(catId)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  selectedCategory === catId
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {catId === "all" ? "すべて" : cat ? `${cat.emoji} ${cat.label}` : catId}
              </button>
            );
          })}
        </div>
      )}

      {/* ランキングリスト */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rankedChannels.map((channel, idx) => (
          <Link key={channel.id} to={`/channel/${channel.id}`}>
            <div className="flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3 hover:border-primary/40 transition-colors group">
              {/* 順位 */}
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 text-sm font-black ${
                idx < 3 ? RANK_COLORS[idx] : "text-muted-foreground bg-secondary border-border/50"
              }`}>
                {idx === 0 ? <Crown className="w-4 h-4" /> : idx + 1}
              </div>

              {/* アバター */}
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                {channel.avatar_url ? (
                  <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">{channel.name?.[0]}</span>
                )}
              </div>

              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{channel.name}</p>
                <p className="text-xs text-primary font-bold">{getScore(channel)}</p>
              </div>

              {channel.is_live && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse shrink-0">LIVE</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}