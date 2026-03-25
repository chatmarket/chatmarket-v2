import React, { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

function formatDuration(sec) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function VideoThumb({ video }) {
  return (
    <Link
      to={`/watch/${video.id}`}
      className="flex-shrink-0 w-40 group"
    >
      <div className="relative w-40 h-24 rounded-lg overflow-hidden bg-secondary">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
        {video.duration && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
            {formatDuration(video.duration)}
          </span>
        )}
        {!video.is_free && video.price > 0 && (
          <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 rounded font-bold">
            ¥{video.price}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs font-medium leading-tight line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors">
        {video.title}
      </p>
      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
        <Eye className="w-2.5 h-2.5" />{video.view_count || 0}
      </p>
    </Link>
  );
}

function ScrollRow({ videos }) {
  const rowRef = useRef(null);
  const scroll = (dir) => {
    if (rowRef.current) rowRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center shadow hover:bg-secondary transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div
        ref={rowRef}
        className="flex gap-3 overflow-x-auto scrollbar-none px-8"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {videos.map((v) => (
          <div key={v.id} style={{ scrollSnapAlign: "start" }}>
            <VideoThumb video={v} />
          </div>
        ))}
      </div>
      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center shadow hover:bg-secondary transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function RecommendedVideos({ currentVideoId, category }) {
  const { data: videos = [] } = useQuery({
    queryKey: ["recommended-videos", category],
    queryFn: () =>
      base44.entities.Video.filter(
        category ? { category } : {},
        "-view_count",
        20
      ),
  });

  const filtered = videos.filter((v) => v.id !== currentVideoId);
  if (filtered.length === 0) return null;

  // Split into 2 rows
  const row1 = filtered.filter((_, i) => i % 2 === 0);
  const row2 = filtered.filter((_, i) => i % 2 === 1);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground">
        {category ? `「${category}」のおすすめ` : "おすすめ動画"}
      </h3>
      <ScrollRow videos={row1} />
      {row2.length > 0 && <ScrollRow videos={row2} />}
    </div>
  );
}