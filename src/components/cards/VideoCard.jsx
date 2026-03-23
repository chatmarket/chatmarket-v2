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
        {!video.is_free && video.price > 0 && (
          <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground border-0">
            ¥{video.price?.toLocaleString()}
          </Badge>
        )}
        {video.is_free && (
          <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground border-0">
            無料
          </Badge>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className={`font-semibold line-clamp-2 group-hover:text-primary transition-colors ${isLarge ? "text-base" : "text-sm"}`}>
          {video.title}
        </h3>
        <p className="text-xs text-muted-foreground">{video.channel_name}</p>
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