import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "../components/cards/VideoCard";
import { Search as SearchIcon } from "lucide-react";

export default function Search() {
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get("q") || "";

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => base44.entities.Video.list("-created_date", 50),
    enabled: !!query,
  });

  const filtered = videos.filter(
    (v) =>
      v.title?.toLowerCase().includes(query.toLowerCase()) ||
      v.channel_name?.toLowerCase().includes(query.toLowerCase()) ||
      v.description?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <SearchIcon className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">
          「{query}」の検索結果
        </h1>
        <span className="text-muted-foreground text-sm">({filtered.length}件)</span>
      </div>

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
        <div className="text-center py-24">
          <p className="text-muted-foreground">検索結果がありません</p>
        </div>
      )}
    </div>
  );
}