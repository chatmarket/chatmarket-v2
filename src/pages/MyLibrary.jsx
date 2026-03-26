import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Trash2, History, Heart, Eye, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatDuration(seconds) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function VideoListItem({ video, onRemove }) {
  return (
    <div className="flex gap-3 items-start bg-card rounded-xl p-3 border border-border/50 group">
      <Link to={`/watch/${video.video_id}`} className="shrink-0 relative w-36 aspect-video rounded-lg overflow-hidden bg-secondary">
        {video.video_thumbnail ? (
          <img src={video.video_thumbnail} alt={video.video_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🎬</div>
        )}
        {video.is_free ? (
          <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">FREE</span>
        ) : video.price > 0 ? (
          <span className="absolute top-1 left-1 bg-secondary text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded border border-border">¥{video.price?.toLocaleString()}</span>
        ) : null}
      </Link>
      <div className="flex-1 min-w-0">
        <Link to={`/watch/${video.video_id}`} className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors">
          {video.video_title}
        </Link>
        <Link to={`/channel/${video.channel_id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 block">
          {video.channel_name}
        </Link>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(video.updated_date || video.created_date).toLocaleDateString("ja-JP")}
        </p>
      </div>
      <button
        onClick={() => onRemove(video.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function MyLibrary() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("history");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: history = [] } = useQuery({
    queryKey: ["watch-history", user?.email],
    queryFn: () => base44.entities.WatchHistory.filter({ user_email: user.email }, "-updated_date", 50),
    enabled: !!user,
  });

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites", user?.email],
    queryFn: () => base44.entities.Favorite.filter({ user_email: user.email }, "-created_date", 50),
    enabled: !!user,
  });

  const { data: followedChannels = [] } = useQuery({
    queryKey: ["followed-channels", user?.email],
    queryFn: () => base44.entities.ChannelFollow.filter({ follower_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  const { data: allVideos = [] } = useQuery({
    queryKey: ["all-videos"],
    queryFn: () => base44.entities.Video.list("-created_date", 100),
    enabled: !!user,
  });

  const followedVideoIds = followedChannels.map((cf) => cf.channel_id);
  const followedChannelsVideos = allVideos.filter((v) => followedVideoIds.includes(v.channel_id) && v.moderation_status === "approved");

  const removeHistory = useMutation({
    mutationFn: (id) => base44.entities.WatchHistory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watch-history", user?.email] }),
  });

  const removeFavorite = useMutation({
    mutationFn: (id) => base44.entities.Favorite.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites", user?.email] }),
  });

  const clearHistory = useMutation({
    mutationFn: async () => {
      for (const h of history) await base44.entities.WatchHistory.delete(h.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["watch-history", user?.email] }),
  });

  const items = tab === "history" ? history : tab === "favorites" ? favorites : [];
  const onRemove = tab === "history" ? (id) => removeHistory.mutate(id) : tab === "favorites" ? (id) => removeFavorite.mutate(id) : () => {};

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">マイライブラリ</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-6 w-fit overflow-x-auto">
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${tab === "history" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
        >
          <History className="w-4 h-4" />
          再生履歴 {history.length > 0 && <span className="bg-primary/20 text-primary text-xs rounded-full px-1.5">{history.length}</span>}
        </button>
        <button
          onClick={() => setTab("favorites")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${tab === "favorites" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Heart className="w-4 h-4" />
          お気に入り {favorites.length > 0 && <span className="bg-primary/20 text-primary text-xs rounded-full px-1.5">{favorites.length}</span>}
        </button>
        <button
          onClick={() => setTab("followed")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${tab === "followed" ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Play className="w-4 h-4" />
          フォロー中の新着 {followedChannelsVideos.length > 0 && <span className="bg-primary/20 text-primary text-xs rounded-full px-1.5">{followedChannelsVideos.length}</span>}
        </button>
      </div>

      {/* Clear history button */}
      {tab === "history" && history.length > 0 && (
        <div className="flex justify-end mb-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive text-xs gap-1"
            onClick={() => clearHistory.mutate()}
            disabled={clearHistory.isPending}
          >
            <Trash2 className="w-3.5 h-3.5" />
            履歴をすべて削除
          </Button>
        </div>
      )}

      {/* List */}
      {tab === "followed" ? (
        followedChannelsVideos.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Play className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>フォロー中のチャンネルの新着動画はありません</p>
            <p className="text-xs mt-1">チャンネルをフォローして最新動画をチェック</p>
          </div>
        ) : (
          <div className="space-y-3">
            {followedChannelsVideos.map((video) => (
              <div key={video.id} className="flex gap-3 items-start bg-card rounded-xl p-3 border border-border/50 group">
                <Link to={`/watch/${video.id}`} className="shrink-0 relative w-36 aspect-video rounded-lg overflow-hidden bg-secondary">
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">🎬</div>
                  )}
                  {video.is_free ? (
                    <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">FREE</span>
                  ) : video.price > 0 ? (
                    <span className="absolute top-1 left-1 bg-secondary text-foreground text-[10px] font-bold px-1.5 py-0.5 rounded border border-border">¥{video.price?.toLocaleString()}</span>
                  ) : null}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/watch/${video.id}`} className="font-semibold text-sm line-clamp-2 hover:text-primary transition-colors">
                    {video.title}
                  </Link>
                  <Link to={`/channel/${video.channel_id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1 block">
                    {video.channel_name}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(video.created_date).toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          {tab === "history" ? (
            <>
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>再生履歴はありません</p>
            </>
          ) : (
            <>
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>お気に入りはありません</p>
              <p className="text-xs mt-1">動画再生ページで ♥ ボタンを押して保存できます</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <VideoListItem key={item.id} video={item} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}