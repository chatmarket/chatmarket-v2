import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Users, Radio, Clock, Calendar, Phone } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return format(d, "M月d日(EEE) HH:mm", { locale: ja });
}

export default function LiveStreamCard({ stream, channelCallEnabled }) {
  const isLive = stream.status === "live";
  const isScheduled = stream.status === "scheduled";

  return (
    <Link to={`/live/${stream.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl aspect-video bg-secondary">
        {stream.thumbnail_url ? (
          <img
            src={stream.thumbnail_url}
            alt={stream.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-primary/10 flex items-center justify-center">
            <Radio className={`w-8 h-8 ${isLive ? "text-red-400 animate-pulse" : "text-blue-400"}`} />
          </div>
        )}

        {/* ステータスバッジ */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isLive && (
            <Badge className="bg-red-500 text-white border-0 flex items-center gap-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              LIVE
            </Badge>
          )}
          {isScheduled && (
            <Badge className="bg-blue-600 text-white border-0 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              配信予定
            </Badge>
          )}
        </div>

        {/* 視聴者数（LIVEのみ） */}
        {isLive && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
            <Users className="w-3 h-3" />
            {stream.viewer_count || 0}
          </div>
        )}

        {/* 通話受付バッジ */}
        {channelCallEnabled !== undefined && (
          <div className={`absolute bottom-2 left-2 text-xs px-2 py-1 rounded-md flex items-center gap-1 font-bold ${
            channelCallEnabled
              ? "bg-green-500/80 text-white"
              : "bg-black/60 text-white/50"
          }`}>
            <Phone className="w-3 h-3" />
            {channelCallEnabled ? "通話受付中" : "通話オフ"}
          </div>
        )}

        {/* 料金 */}
        {stream.price > 0 && (
          <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground border-0">
            ¥{stream.price?.toLocaleString()}
          </Badge>
        )}

        {/* オーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* タイトル・時間 */}
        <div className="absolute bottom-0 left-0 right-0 p-3 space-y-0.5">
          <h3 className="text-white font-semibold text-sm line-clamp-1">{stream.title}</h3>
          <p className="text-white/70 text-xs">{stream.channel_name}</p>
          {isLive && stream.live_started_at && (
            <p className="text-red-300 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              配信開始: {formatTime(stream.live_started_at)}
            </p>
          )}
          {isScheduled && stream.scheduled_at && (
            <p className="text-blue-300 text-[11px] flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              配信予定: {formatTime(stream.scheduled_at)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}