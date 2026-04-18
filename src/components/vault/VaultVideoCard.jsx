import React, { useState, useRef } from "react";
import { Lock, Play, CheckCircle, Clock, Eye } from "lucide-react";

export default function VaultVideoCard({ video, isPurchased, onSelect }) {
  const [hovering, setHovering] = useState(false);
  const videoRef = useRef(null);

  const handleMouseEnter = () => {
    setHovering(true);
    if (videoRef.current && video.video_url) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    setHovering(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const durationLabel = video.duration
    ? `${Math.floor(video.duration / 60)}分${video.duration % 60 > 0 ? video.duration % 60 + "秒" : ""}`
    : null;

  return (
    <div
      className="group relative rounded-xl overflow-hidden border border-amber-500/20 bg-card cursor-pointer transition-all duration-300 hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-500/10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
    >
      {/* Thumbnail / Preview */}
      <div className="relative aspect-video bg-zinc-900 overflow-hidden">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className={`w-full h-full object-cover transition-all duration-500 ${hovering ? "scale-105 opacity-40" : "opacity-100"}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-900/20 to-zinc-900">
            <Play className="w-10 h-10 text-amber-500/30" />
          </div>
        )}

        {/* 30秒プレビュー動画 */}
        {hovering && video.video_url && !isPurchased && (
          <video
            ref={videoRef}
            src={video.video_url}
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ maxDuration: 30 }}
          />
        )}

        {/* Overlay badges */}
        <div className="absolute inset-0 flex flex-col justify-between p-2.5 pointer-events-none">
          <div className="flex justify-between items-start">
            {isPurchased ? (
              <span className="flex items-center gap-1 bg-green-500/90 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> 購入済み
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-amber-500/90 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" /> ¥{video.price?.toLocaleString()}
              </span>
            )}
            {durationLabel && (
              <span className="flex items-center gap-1 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3" /> {durationLabel}
              </span>
            )}
          </div>

          {/* Play button on hover */}
          {hovering && (
            <div className="flex items-center justify-center flex-1">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                <Play className="w-6 h-6 text-white ml-0.5" />
              </div>
            </div>
          )}

          {/* 30秒チラ見せ表示 */}
          {hovering && !isPurchased && (
            <div className="self-center bg-amber-500/80 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
              30秒チラ見せ中...
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="font-bold text-sm line-clamp-2 leading-tight">{video.title}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="w-3 h-3" />
            {video.view_count || 0} 回視聴
          </div>
          <span className={`text-xs font-black ${isPurchased ? "text-green-400" : "text-amber-400"}`}>
            {isPurchased ? "✓ 視聴可" : `¥${video.price?.toLocaleString()}`}
          </span>
        </div>
      </div>
    </div>
  );
}