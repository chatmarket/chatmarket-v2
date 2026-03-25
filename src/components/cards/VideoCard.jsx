import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock } from "lucide-react";

function formatDuration(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatViews(count) {
  if (!count) return "0";
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function VideoCard({ video, size = "default" }) {
  const isLarge = size === "large";

  return (
    <Link to={`/watch/${video.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl aspect-video bg-secondary">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-4xl opacity-30">🎬</span>
          </div>
        )}

        {/* SAMPLE watermark */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <span className="text-white/30 text-3xl font-black" style={{ transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
            SAMPLE
          </span>
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded-md font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Price badge */}
        {video.is_free ? (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground border-0 font-bold">
            FREE
          </Badge>
        ) : video.price > 0 ? (
          <Badge className="absolute top-2 left-2 bg-black/80 text-white border-0">
            ¥{video.price?.toLocaleString()}
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className={`font-semibold line-clamp-2 group-hover:text-primary transition-colors ${isLarge ? "text-base" : "text-sm"}`}>
          {video.is_free && <span className="text-primary font-bold mr-1">[FREE]</span>}
          {!video.is_free && video.price > 0 && <span className="text-yellow-400 font-bold mr-1">¥{video.price?.toLocaleString()}</span>}
          {video.title}
        </h3>
        <Link
          to={`/channel/${video.channel_id}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 group/ch"
        >
          {video.channel_avatar ? (
            <img src={video.channel_avatar} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-primary">{video.channel_name?.[0]}</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground group-hover/ch:text-primary transition-colors truncate">{video.channel_name}</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatViews(video.view_count)} 回視聴
          </span>
        </div>
      </div>
    </Link>
  );
}