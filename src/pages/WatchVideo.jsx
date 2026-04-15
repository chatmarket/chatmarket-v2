import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ChatPanel from "../components/chat/ChatPanel.jsx";
import PaywallModal from "../components/video/PaywallModal";
import PaywallOverlay from "../components/video/PaywallOverlay";
import CommentSection from "../components/video/CommentSection";
import ReactionBar from "../components/video/ReactionBar";
import { Eye, Calendar, Heart, Maximize, Minimize } from "lucide-react";
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
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [signedVideoUrl, setSignedVideoUrl] = useState(null);
  const queryClient = useQueryClient();
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
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
      setHasPurchased(purchases.length > 0);
    });
  }, [user, video, id]);

  // Get CloudFront signed URL once access is confirmed
  useEffect(() => {
    if (!video || !user) return;
    if (!hasPurchased && !video.is_free && video.price > 0) return;
    base44.functions.invoke('getSignedVideoUrl', { videoId: video.id })
      .then(res => { if (res.data?.signedUrl) setSignedVideoUrl(res.data.signedUrl); })
      .catch(() => setSignedVideoUrl(video.video_url));
  }, [video?.id, user?.email, hasPurchased]);

  // Increment view count with session-based deduplication (prevents reload abuse)
  useEffect(() => {
    if (!video || !user) return;

    const sessionKey = `viewed_${video.id}`;
    const alreadyViewed = sessionStorage.getItem(sessionKey);

    if (!alreadyViewed) {
      // Mark as viewed in session to prevent duplicate counts on reload
      sessionStorage.setItem(sessionKey, '1');
      // Debounce: wait 5 seconds before counting (user must actually watch)
      const timer = setTimeout(() => {
        base44.entities.Video.update(video.id, {
          view_count: (video.view_count || 0) + 1,
        });
      }, 5000);
      // Cleanup if user navigates away before 5s
      return () => clearTimeout(timer);
    }
  }, [video?.id, user?.email]);

  // Record watch history & check favorites
  useEffect(() => {
    if (!video || !user) return;
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

  // Monitor video time for paywall & prevent seeking past preview
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

    const handleSeeking = () => {
      if (v.currentTime >= FREE_PREVIEW_SECONDS && !hasPurchased) {
        v.currentTime = FREE_PREVIEW_SECONDS - 0.1;
        v.pause();
        setPreviewEnded(true);
        setShowPaywall(true);
      }
    };

    v.addEventListener("timeupdate", handleTimeUpdate);
    v.addEventListener("seeking", handleSeeking);
    return () => {
      v.removeEventListener("timeupdate", handleTimeUpdate);
      v.removeEventListener("seeking", handleSeeking);
    };
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
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Video Player */}
        <div className="space-y-3 sm:space-y-4 lg:col-span-2">
          <div ref={containerRef} className="relative aspect-video bg-black rounded-xl overflow-hidden">
            {(signedVideoUrl || video.video_url) ? (
              <video
                ref={videoRef}
                src={signedVideoUrl || video.video_url}
                className="w-full h-full object-contain"
                controls
                autoPlay
                poster={video.thumbnail_url}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary">
                <p className="text-muted-foreground">動画がまだアップロードされていません</p>
              </div>
            )}

            {/* SAMPLE watermark - 未購入の有料動画のみ表示 */}
            {isPaid && !hasPurchased && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                <span className="text-white/30 text-6xl font-black" style={{ transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                  SAMPLE
                </span>
              </div>
            )}

            {/* Preview indicator */}
            {isPaid && !hasPurchased && !previewEnded && (
              <div className="absolute top-3 right-3 bg-black/80 text-white px-3 py-1 rounded-full text-xs font-medium z-20">
                30秒プレビュー中
              </div>
            )}

            {/* Video controls overlay */}
            {(signedVideoUrl || video.video_url) && (
              <div className="absolute bottom-12 right-3 flex items-center gap-2">
                <VideoControls videoRef={videoRef} showQuality={true} />
                <button
                  onClick={toggleFullscreen}
                  className="bg-black/70 hover:bg-black/90 text-white rounded-lg p-1.5 transition-all"
                  title={isFullscreen ? "全画面解除" : "全画面表示"}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>

          {/* Video info */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
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
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
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
              <div className="bg-card rounded-xl p-3 sm:p-4 border border-border/50">
                <p className="text-xs sm:text-sm text-foreground/80 whitespace-pre-wrap">{video.description}</p>
              </div>
            )}
            <div className="space-y-3">
              <ReactionBar targetType="video" targetId={id} user={user} />
              <CommentSection targetType="video" targetId={id} user={user} />
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="h-[400px] sm:h-[500px] lg:h-[calc(100vh-8rem)] lg:col-span-1">
          <ChatPanel targetType="video" targetId={id} />
        </div>
      </div>

      {/* Recommended Videos */}
      <div className="mt-4 sm:mt-6">
        <RecommendedVideos currentVideoId={id} category={video.category} />
      </div>

      {/* Paywall Modal */}
      {showPaywall && !hasPurchased && video && (
        <PaywallModal
          video={video}
          user={user}
          onPurchased={() => setHasPurchased(true)}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </div>
  );
}