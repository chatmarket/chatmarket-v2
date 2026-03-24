import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import VideoCard from "../components/cards/VideoCard";
import { Search as SearchIcon, X } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";

export default function Search() {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get("q") || "";
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => base44.entities.Video.list("-created_date", 100),
    enabled: !!query || true,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels-search"],
    queryFn: () => base44.entities.Channel.list(),
  });

  // カテゴリ検索: チャンネルのcategory_idまたはtagsで絞り込み
  const getCategoryChannelIds = () => {
    if (!selectedCategory) return null;
    const cat = CATEGORIES.find((c) => c.id === selectedCategory);
    return channels
      .filter((ch) => {
        if (ch.category_id === selectedCategory) return true;
        if (ch.tags?.some((t) => cat?.tags?.includes(t))) return true;
        return false;
      })
      .map((ch) => ch.id);
  };

  const catChannelIds = getCategoryChannelIds();

  const filtered = videos.filter((v) => {
    const textMatch =
      !query ||
      v.title?.toLowerCase().includes(query.toLowerCase()) ||
      v.channel_name?.toLowerCase().includes(query.toLowerCase()) ||
      v.description?.toLowerCase().includes(query.toLowerCase());

    const catMatch = !catChannelIds || catChannelIds.includes(v.channel_id);

    return textMatch && catMatch;
  });

  const clearCategory = () => setSelectedCategory(null);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <SearchIcon className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">
          {query ? `「${query}」の検索結果` : "カテゴリ検索"}
        </h1>
        <span className="text-muted-foreground text-sm">({filtered.length}件)</span>
      </div>

      {/* Category filter */}
      <div className="mb-6 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">業種カテゴリで絞り込む</p>
        {selectedCategory && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-primary font-semibold">
              {CATEGORIES.find((c) => c.id === selectedCategory)?.emoji}{" "}
              {CATEGORIES.find((c) => c.id === selectedCategory)?.label}
            </span>
            <button
              onClick={clearCategory}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border/50 px-2 py-0.5 rounded-full"
            >
              <X className="w-3 h-3" /> 絞り込み解除
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : `${cat.badgeColor} bg-opacity-20 border-white/10 hover:border-primary/40`
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-secondary rounded-xl" />
              <div className="mt-3 h-4 bg-secondary rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 space-y-2">
          <SearchIcon className="w-10 h-10 mx-auto text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">該当する動画が見つかりません</p>
          <p className="text-xs text-muted-foreground">別のカテゴリや検索ワードをお試しください</p>
        </div>
      )}
    </div>
  );
}