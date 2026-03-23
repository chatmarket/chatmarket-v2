import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Users, Radio } from "lucide-react";

export default function LiveStreamCard({ stream }) {
  return (
    <Link to={`/live/${stream.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl aspect-video bg-secondary">
        {stream.thumbnail_url ? (
          <img
            src={stream.thumbnail_url}
            alt={stream.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-primary/10 flex items-center justify-center">
            <Radio className="w-8 h-8 text-red-400 animate-pulse" />
          </div>
        )}

        {/* Live pulse indicator */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge className="bg-red-500 text-white border-0 flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white" />
            LIVE
          </Badge>
        </div>

        {/* Viewer count */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
          <Users className="w-3 h-3" />
          {stream.viewer_count || 0}
        </div>

        {/* Price */}
        {stream.price > 0 && (
          <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground border-0">
            ¥{stream.price?.toLocaleString()}
          </Badge>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="text-white font-semibold text-sm line-clamp-1">{stream.title}</h3>
          <p className="text-white/70 text-xs mt-0.5">{stream.channel_name}</p>
        </div>
      </div>
    </Link>
  );
}