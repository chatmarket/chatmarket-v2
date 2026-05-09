import React from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock } from "lucide-react";
import OptimizedImage from "@/components/ui/OptimizedImage";

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
  const navigate = useNavigate();


  return (
    <Link to={`/watch/${video.id}`} className="group block">
      <div className="relative overflow-hidden rounded-lg sm:rounded-xl aspect-video bg-secondary">
        {video.thumbnail_url ? (
          <OptimizedImage
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-75"
            skeletonClassName="w-full h-full"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <span className="text-4xl opacity-30">🎬</span>
          </div>
        )}

        {/* ホバー時: シマーライン（動画が動く感） */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)",
            transform: "translateX(-100%)",
            animation: "shimmerSlide 1.2s ease-in-out forwards",
          }} />
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* ホバー時: 再生ボタン */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#000"><polygon points="5,3 19,12 5,21" /></svg>
          </div>
        </div>

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

      <style>{`@keyframes shimmerSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>

      <div className="mt-2 space-y-1">
        <h3 className={`font-semibold line-clamp-2 group-hover:text-primary transition-colors ${isLarge ? "text-base" : "text-xs sm:text-sm"}`}>
          {video.is_free && <span className="text-primary font-bold mr-1">[FREE]</span>}
          {!video.is_free && video.price > 0 && <span className="text-yellow-400 font-bold mr-1">¥{video.price?.toLocaleString()}</span>}
          {video.title}
        </h3>
        <div
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/channel/${video.channel_id}`); }}
          className="flex items-center gap-1.5 group/ch cursor-pointer"
        >
          {video.channel_avatar ? (
            <img src={video.channel_avatar} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-primary">{video.channel_name?.[0]}</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground group-hover/ch:text-primary transition-colors truncate">{video.channel_name}</span>
        </div>
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