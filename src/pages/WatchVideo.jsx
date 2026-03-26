import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ChatPanel from "../components/chat/ChatPanel";
import PaywallModal from "../components/video/PaywallModal";
import { Eye, Calendar, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import VideoComments from "../components/video/VideoComments";
import VideoReactions from "../components/video/VideoReactions";
import VideoControls from "../components/video/VideoControls";
import RecommendedVideos from "../components/video/RecommendedVideos";

const FREE_PREVIEW_SECONDS = 30;

export default function WatchVideo() {
  const { id } = useParams();
  const videoRef = useRef(null);
  const [user, setUser] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [previewEnded, setPreviewEnded] = useState(false);
  const queryClient = useQueryClient();
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: video, isLoading } = useQuery({
    queryKey: ["video", id],
    queryFn: async () => {
      const videos = await base44.entities.Video.filter({ id });
      return videos[0];
    },
  });

  // Check if user already purchased
  useEffect(() => {
    if (!user || !video) return;
    if (video.is_free || video.price === 0) {
      setHasPurchased(true);
      return;
    }
    base44.entities.Purchase.filter({
      item_type: "video",
      item_id: id,
      buyer_email: user.email,
      status: "completed",
    }).then((purchases) => {
      if (purchases.length > 0) setHasPurchased(true);
    });
  }, [user, video, id]);

  // Increment view count & record watch history
  useEffect(() => {
    if (!video || !user) return;
    base44.entities.Video.update(video.id, {
      view_count: (video.view_count || 0) + 1,
    });
    // Upsert watch history
    base44.entities.WatchHistory.filter({ video_id: video.id, user_email: user.email }).then((existing) => {
      if (existing.length > 0) {
        base44.entities.WatchHistory.update(existing[0].id, { updated_date: new Date().toISOString() });
      } else {
        base44.entities.WatchHistory.create({
          user_email: user.email,
          video_id: video.id,
          video_title: video.title,
          video_thumbnail: video.thumbnail_url || "",
          channel_id: video.channel_id,
          channel_name: video.channel_name || "",
          is_free: video.is_free,
          price: video.price || 0,
        });
      }
    });
    // Check favorite status
    base44.entities.Favorite.filter({ video_id: video.id, user_email: user.email }).then((favs) => {
      if (favs.length > 0) { setIsFavorited(true); setFavoriteId(favs[0].id); }
    });
  }, [video?.id, user?.email]);

  // Monitor video time for paywall
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !video || video.is_free || hasPurchased) return;

    const handleTimeUpdate = () => {
      if (v.currentTime >= FREE_PREVIEW_SECONDS && !hasPurchased) {
        v.pause();
        setPreviewEnded(true);
        setShowPaywall(true);
      }
    };

    v.addEventListener("timeupdate", handleTimeUpdate);
    return () => v.removeEventListener("timeupdate", handleTimeUpdate);
  }, [video, hasPurchased]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="aspect-video bg-secondary rounded-xl" />
          <div className="mt-4 h-6 bg-secondary rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">動画が見つかりません</p>
      </div>
    );
  }

  const isPaid = !video.is_free && video.price > 0;

  const toggleFavorite = async () => {
    if (!user) { toast.error("ログインが必要です"); return; }
    if (isFavorited && favoriteId) {
      await base44.entities.Favorite.delete(favoriteId);
      setIsFavorited(false);
      setFavoriteId(null);
      toast.success("お気に入りを解除しました");
    } else {
      const fav = await base44.entities.Favorite.create({
        user_email: user.email,
        video_id: video.id,
        video_title: video.title,
        video_thumbnail: video.thumbnail_url || "",
        channel_id: video.channel_id,
        channel_name: video.channel_name || "",
        is_free: video.is_free,
        price: video.price || 0,
      });
      setIsFavorited(true);
      setFavoriteId(fav.id);
      toast.success("お気に入りに追加しました ♥");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
            {video.video_url ? (
              <video
                ref={videoRef}
                src={video.video_url}
                className="w-full h-full object-contain"
                controls
                poster={video.thumbnail_url}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <p className="text-muted-foreground">動画がまだアップロードされていません</p>
              </div>
            )}

            {/* SAMPLE watermark - 未購入の有料動画のみ表示 */}
            {isPaid && !hasPurchased && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <span className="text-white/30 text-6xl font-black" style={{ transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                  SAMPLE
                </span>
              </div>
            )}

            {/* Preview indicator */}
            {isPaid && !hasPurchased && !previewEnded && (
              <div className="absolute top-3 right-3 bg-black/80 text-white px-3 py-1 rounded-full text-xs font-medium">
                30秒プレビュー中
              </div>
            )}

            {/* Video controls overlay */}
            {video.video_url && (
              <div className="absolute bottom-12 right-3">
                <VideoControls videoRef={videoRef} showQuality={true} />
              </div>
            )}
          </div>

          {/* Video info */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl md:text-2xl font-bold flex-1">
                {video.is_free && (
                  <span className="inline-block bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded mr-2 align-middle">FREE</span>
                )}
                {!video.is_free && video.price > 0 && (
                  <span className="inline-block bg-yellow-400/20 text-yellow-400 text-sm font-bold px-2 py-0.5 rounded mr-2 align-middle">¥{video.price?.toLocaleString()}</span>
                )}
                {video.title}
              </h1>
              <button
                onClick={toggleFavorite}
                className={`shrink-0 mt-1 w-10 h-10 rounded-full flex items-center justify-center transition-all ${isFavorited ? "bg-red-500 text-white" : "bg-secondary text-muted-foreground hover:text-red-400"}`}
                title={isFavorited ? "お気に入り解除" : "お気に入りに追加"}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? "fill-white" : ""}`} />
              </button>
            </div>

            {/* Channel info */}
            <Link to={`/channel/${video.channel_id}`} className="flex items-center gap-3 group w-fit">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden ring-2 ring-border group-hover:ring-primary transition-all">
                {video.channel_avatar ? (
                  <img src={video.channel_avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">{video.channel_name?.[0]}</span>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm group-hover:text-primary transition-colors">{video.channel_name}</p>
                <p className="text-xs text-muted-foreground">チャンネルを見る →</p>
              </div>
            </Link>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {video.view_count || 0} 回視聴
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {video.created_date && format(new Date(video.created_date), "yyyy/MM/dd")}
              </span>
            </div>
            {video.description && (
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{video.description}</p>
              </div>
            )}
            <VideoReactions videoId={id} user={user} />
            <VideoComments videoId={id} user={user} />
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-1 h-[500px] lg:h-[calc(100vh-8rem)]">
          <ChatPanel targetType="video" targetId={id} />
        </div>
      </div>

      {/* Recommended Videos */}
      <div className="mt-6">
        <RecommendedVideos currentVideoId={id} category={video.category} />
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <PaywallModal
          video={video}
          user={user}
          onPurchased={() => {
            setHasPurchased(true);
            setPreviewEnded(false);
            setShowPaywall(false);
            if (videoRef.current) videoRef.current.play();
          }}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </div>
  );
}