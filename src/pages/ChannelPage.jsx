import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "../components/cards/VideoCard";
import LiveStreamCard from "../components/cards/LiveStreamCard";
import { Button } from "@/components/ui/button";
import { Users, Video, Radio, MessageCircle, Upload } from "lucide-react";
import CategoryBadge from "../components/channel/CategoryBadge";

export default function ChannelPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);

  const { data: channel, isLoading } = useQuery({
    queryKey: ["channel", id],
    queryFn: async () => {
      const channels = await base44.entities.Channel.filter({ id });
      return channels[0];
    },
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["channel-videos", id],
    queryFn: () => base44.entities.Video.filter({ channel_id: id }, "-created_date"),
    enabled: !!id,
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ["channel-streams", id],
    queryFn: () => base44.entities.LiveStream.filter({ channel_id: id, status: "live" }),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-secondary rounded-2xl" />
          <div className="h-6 bg-secondary rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">チャンネルが見つかりません</p>
      </div>
    );
  }

  const isOwner = currentUser?.email === channel.owner_email;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Channel header card */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-border">
            {channel.avatar_url ? (
              <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">{channel.name?.[0]}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name */}
            <h1 className="text-2xl font-black truncate">{channel.name}</h1>

            {/* Category & Tags */}
            {(channel.category_id || channel.tags?.length > 0) && (
              <div className="mt-1.5">
                <CategoryBadge categoryId={channel.category_id} tags={channel.tags} />
              </div>
            )}

            {/* Description / Bio */}
            {channel.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                {channel.description}
              </p>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5" /> {videos.length} 動画
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {channel.subscriber_count || 0} 登録者
              </span>
              {channel.is_live && (
                <span className="flex items-center gap-1 text-red-400 font-semibold">
                  <Radio className="w-3.5 h-3.5 animate-pulse" /> 配信中
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
            {isOwner ? (
              <Link to="/my-channel">
                <Button size="sm" variant="secondary" className="gap-2 w-full">
                  <Upload className="w-4 h-4" /> チャンネル管理
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={() => navigate(`/chat/${id}`)}
              >
                <MessageCircle className="w-4 h-4" />
                チャットで問い合わせ
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Live streams */}
      {liveStreams.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-400" /> ライブ配信中
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {liveStreams.map((s) => (
              <LiveStreamCard key={s.id} stream={s} />
            ))}
          </div>
        </section>
      )}

      {/* Videos */}
      <section>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Video className="w-5 h-5 text-primary" /> 投稿動画
          <span className="text-sm font-normal text-muted-foreground">（{videos.length}本）</span>
        </h2>
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground">まだ動画がありません</p>
          </div>
        )}
      </section>
    </div>
  );
}