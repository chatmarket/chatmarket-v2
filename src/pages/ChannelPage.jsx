import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "../components/cards/VideoCard";
import LiveStreamCard from "../components/cards/LiveStreamCard";
import RevenueRankingWidget from "../components/ranking/RevenueRankingWidget";
import { Button } from "@/components/ui/button";
import { Users, Video, Radio, MessageCircle, Upload, Bell, BellOff, Home, CalendarDays, Flag, Users as UsersIcon, Gem, Shield } from "lucide-react";
import ReportChannelDialog from "../components/channel/ReportChannelDialog";
import CategoryBadge from "../components/channel/CategoryBadge";
import FanCommunityTab from "../components/community/FanCommunityTab";
import VaultTab from "../components/vault/VaultTab";
import SanctumTab from "../components/vault/SanctumTab";

export default function ChannelPage() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState("videos"); // "videos" | "vault" | "sanctum" | "community"
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);

  const { data: channel, isLoading } = useQuery({
    queryKey: ["channel", channelId],
    queryFn: async () => {
      const channels = await base44.entities.Channel.filter({ id: channelId });
      return channels[0];
    },
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["channel-videos", channelId],
    queryFn: () => base44.entities.Video.filter({ channel_id: channelId }, "-created_date"),
    enabled: !!channelId,
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ["channel-streams", channelId],
    queryFn: () => base44.entities.LiveStream.filter({ channel_id: channelId, status: "live" }),
    enabled: !!channelId,
  });

  const { data: followData = [] } = useQuery({
    queryKey: ["channel-follow", channelId, currentUser?.email],
    queryFn: () => base44.entities.ChannelFollow.filter({ channel_id: channelId, follower_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const { data: followerCount = [] } = useQuery({
    queryKey: ["channel-follower-count", channelId],
    queryFn: () => base44.entities.ChannelFollow.filter({ channel_id: channelId }),
  });

  const isFollowing = followData.length > 0;

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await base44.entities.ChannelFollow.delete(followData[0].id);
      } else {
        await base44.entities.ChannelFollow.create({
          channel_id: channelId,
          channel_name: channel?.name || "",
          follower_email: currentUser.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-follow", channelId, currentUser?.email] });
      queryClient.invalidateQueries({ queryKey: ["channel-follower-count", channelId] });
    },
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
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Channel header card */}
      <div className="bg-card rounded-xl sm:rounded-2xl border border-border/50 p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-5">
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
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5" /> {videos.length} 動画
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {followerCount.length} フォロワー
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
            <Link to="/">
              <Button size="sm" variant="outline" className="gap-2 w-full">
                <Home className="w-4 h-4" /> TOPに戻る
              </Button>
            </Link>
            {isOwner ? (
              <Link to="/my-channel">
                <Button size="sm" variant="secondary" className="gap-2 w-full">
                  <Upload className="w-4 h-4" /> チャンネル管理
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!currentUser) { base44.auth.redirectToLogin(); return; }
                    toggleFollow.mutate();
                  }}
                  className={`gap-2 w-full ${isFollowing ? "bg-secondary hover:bg-destructive/20 text-foreground" : "bg-primary hover:bg-primary/90"}`}
                >
                  {isFollowing ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  {isFollowing ? "フォロー中" : "フォローする"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2 w-full"
                  onClick={() => navigate(`/chat/${channelId}`)}
                >
                  <MessageCircle className="w-4 h-4" />
                  チャットで問い合わせ
                </Button>
                {channel.call_enabled && (
                  <Link to={`/call-calendar/${channelId}`}>
                    <Button size="sm" className="gap-2 w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
                      <CalendarDays className="w-4 h-4" />
                      通話を予約する
                    </Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2 w-full text-muted-foreground hover:text-red-400 text-xs"
                  onClick={() => setShowReport(true)}
                >
                  <Flag className="w-3.5 h-3.5" /> このチャンネルを通報
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <ReportChannelDialog
        channel={channel}
        user={currentUser}
        open={showReport}
        onClose={() => setShowReport(false)}
      />

      {/* Tab navigation */}
      <div className="border-b border-border/50 mb-6 sm:mb-8 flex gap-1 overflow-x-auto scrollbar-hide">
        {[
          { key: "videos", icon: Video, label: `動画 (${videos.length})` },
          { key: "vault", icon: Gem, label: "宝物庫", badge: "NEW", badgeColor: "bg-amber-500/20 text-amber-400" },
          { key: "sanctum", icon: Shield, label: "The Sanctum", badge: "FC", badgeColor: "bg-purple-500/20 text-purple-400" },
          { key: "community", icon: UsersIcon, label: "コミュニティ" },
        ].map(({ key, icon: Icon, label, badge, badgeColor }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${badgeColor}`}>{badge}</span>}
          </button>
        ))}
      </div>

      {/* Live streams */}
      {activeTab === "videos" && liveStreams.length > 0 && (
        <section className="mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-400" /> ライブ配信中
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {liveStreams.map((s) => (
              <LiveStreamCard key={s.id} stream={s} />
            ))}
          </div>
        </section>
      )}

      {/* Videos tab */}
      {activeTab === "videos" && (
        <section>
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" /> 投稿動画
            <span className="text-sm font-normal text-muted-foreground">（{videos.length}本）</span>
          </h2>
          {videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
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
      )}

      {/* Vault tab */}
      {activeTab === "vault" && (
        <VaultTab channel={channel} currentUser={currentUser} />
      )}

      {/* Sanctum tab */}
      {activeTab === "sanctum" && (
        <SanctumTab channel={channel} currentUser={currentUser} />
      )}

      {/* Community tab */}
      {activeTab === "community" && (
        <FanCommunityTab
          channel={channel}
          currentUser={currentUser}
          isOwner={isOwner}
          isFollower={isFollowing}
        />
      )}
    </div>
  );
}