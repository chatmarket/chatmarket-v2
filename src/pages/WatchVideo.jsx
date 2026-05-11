import React, { useState, useEffect, useRef } from "react";
import MetaHelmet from "@/components/layout/MetaHelmet";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ChatPanel from "../components/chat/ChatPanel.jsx";
import PaywallModal from "../components/video/PaywallModal";
import PaywallOverlay from "../components/video/PaywallOverlay";
import Preview30SecPaywallModal from "../components/video/Preview30SecPaywallModal";
import CommentSection from "../components/video/CommentSection";
import ReactionBar from "../components/video/ReactionBar";
import { Eye, Calendar, Heart, Maximize, Minimize, MessageSquareOff, MessageSquare, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import VideoComments from "../components/video/VideoComments";
import VideoReactions from "../components/video/VideoReactions";
import VideoControls from "../components/video/VideoControls";
import RecommendedVideos from "../components/video/RecommendedVideos";
import DailyViewTimeIndicator from "../components/video/DailyViewTimeIndicator";

const FREE_PREVIEW_SECONDS = 30;

export default function WatchVideo() {
  const { videoId: id } = useParams();
  const videoRef = useRef(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);
  const [showPaywall, setShowPaywall] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [previewEnded, setPreviewEnded] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [signedVideoUrl, setSignedVideoUrl] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const queryClient = useQueryClient();
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);

  // 【Keyboard-Aware】visualViewport でキーボード高さ検知（滑らかな縮小アニメーション）
  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const diff = Math.max(0, window.innerHeight - window.visualViewport.height);
        setKeyboardHeight(diff > 50 ? diff : 0);
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

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

  // スマホ横向き検知 + 自動フルスクリーン
  useEffect(() => {
    const handleOrientationChange = () => {
      const isLand = window.matchMedia("(orientation: landscape)").matches;
      setIsLandscape(isLand);
      // モバイルで横向きなら自動フルスクリーン要求
      if (isLand && /mobile|android|iphone/i.test(navigator.userAgent)) {
        if (!document.fullscreenElement && containerRef.current) {
          containerRef.current.requestFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener("orientationchange", handleOrientationChange);
    window.addEventListener("resize", handleOrientationChange);
    handleOrientationChange();
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.removeEventListener("resize", handleOrientationChange);
    };
  }, []);

  const { data: video, isLoading } = useQuery({
    queryKey: ["video", id],
    queryFn: async () => {
      const videos = await base44.entities.Video.filter({ id });
      return videos[0];
    },
  });

  // ---- 【鉄壁実装】30秒プレビューロック（インライン）----
  const lockStateRef = useRef({ isLocked: false });
  const isPaidForHook = video ? (!video.is_free && video.price > 0) : false;
  const previewLockEnabled = isPaidForHook && !hasPurchased;

  useEffect(() => {
    if (!previewLockEnabled || !videoRef?.current) return;
    const v = videoRef.current;
    const handleTimeUpdate = () => {
      if (v.currentTime >= FREE_PREVIEW_SECONDS) {
        if (!lockStateRef.current.isLocked) {
          v.pause();
          lockStateRef.current.isLocked = true;
          setPreviewEnded(true);
          setShowPaywall(true);
        }
        v.currentTime = FREE_PREVIEW_SECONDS - 0.01;
      }
    };
    v.addEventListener("timeupdate", handleTimeUpdate);
    return () => v.removeEventListener("timeupdate", handleTimeUpdate);
  }, [previewLockEnabled]);

  useEffect(() => {
    if (!previewLockEnabled || !videoRef?.current) return;
    const v = videoRef.current;
    const handleSeeking = () => {
      if (lockStateRef.current.isLocked && v.currentTime >= FREE_PREVIEW_SECONDS) {
        v.currentTime = FREE_PREVIEW_SECONDS - 0.01;
        v.pause();
      }
    };
    v.addEventListener("seeking", handleSeeking);
    return () => v.removeEventListener("seeking", handleSeeking);
  }, [previewLockEnabled]);

  const unlock = () => { lockStateRef.current.isLocked = false; };

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
    <div className={`w-full flex flex-col overflow-hidden ${isFullscreen ? 'h-screen' : 'h-screen'}`} style={{ paddingTop: isFullscreen ? '0' : 'env(safe-area-inset-top)', paddingBottom: isFullscreen ? '0' : 'env(safe-area-inset-bottom)' }}>
      <MetaHelmet
        title={`${video.title} | ChatMarket`}
        description={video.description || `${video.channel_name}の動画「${video.title}」を視聴する。ChatMarketで有料・無料動画を楽しもう。`}
        image={video.thumbnail_url}
      />
      {/* スクロール可能なメインコンテンツ */}
      <div 
        className={`flex-1 overflow-y-auto ${isFullscreen ? 'px-0' : 'px-3 sm:px-4'} ${isFullscreen ? 'py-0' : 'py-4 sm:py-6'}`}
        style={{
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          maxHeight: keyboardHeight > 0 ? `calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - ${keyboardHeight}px)` : '100%'
        }}
      >
        {!isFullscreen ? (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Video Player */}
            <div className="space-y-3 sm:space-y-4 lg:col-span-2">
              <div className="bg-card border border-border/50 rounded-xl p-3 sm:p-4">
                <DailyViewTimeIndicator />
              </div>
              {/* 【微調整】動画高さ制限 + 縦長防止 */}
              <div ref={containerRef} className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '55vh' }}>
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
                  <div className="absolute flex items-center gap-2 bottom-12 right-3">
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

              {/* Video info — sticky 固定 */}
              <div className="sticky top-4 space-y-3 bg-background z-10">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                  <h1 className="text-xl md:text-2xl font-bold flex-1">
                    {video.is_free && (
                      <span className="inline-block bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded mr-2 align-middle">FREE</span>
                    )}
                    {!video.is_free && video.price > 0 && (
                       <span className="inline-block bg-green-500/20 text-green-400 text-sm font-bold px-2 py-0.5 rounded mr-2 align-middle">販売価格 ¥{video.price?.toLocaleString()}</span>
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

            {/* Chat & Yell */}
            <div className="lg:col-span-1" style={{ minHeight: '300px' }}>
              {showComments && <ChatPanel targetType="video" targetId={id} user={user} />}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-row gap-0">
            {/* Fullscreen Mode */}
            <div className="w-1/2 h-full flex flex-col">
              <div ref={containerRef} className="relative bg-black w-full h-full overflow-hidden rounded-none">
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

                {/* Video controls overlay - fullscreen */}
                {(signedVideoUrl || video.video_url) && (
                  <div className="absolute flex items-center gap-2 bottom-3 right-3">
                    <button
                      onClick={() => setShowComments(!showComments)}
                      className="bg-black/70 hover:bg-black/90 text-white rounded-lg p-1.5 transition-all"
                      title={showComments ? "コメント非表示" : "コメント表示"}
                    >
                      {showComments ? <MessageSquare className="w-4 h-4" /> : <MessageSquareOff className="w-4 h-4" />}
                    </button>
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
            </div>

            {/* Chat & Yell - fullscreen */}
            <div className="w-1/2 h-full flex flex-col gap-2 overflow-hidden">
              {showComments && (
                <div className="flex-1 overflow-y-auto bg-zinc-900 rounded-none border-none min-h-0">
                  <ChatPanel targetType="video" targetId={id} user={user} />
                </div>
              )}
              {/* エールコインボタン常駐（フルスクリーン時） */}
              <div className="bg-black/80 backdrop-blur-sm border-t border-zinc-700 p-3 flex items-center justify-center">
                <button
                  onClick={() => user ? null : base44.auth.redirectToLogin()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl transition-all text-sm shrink-0"
                  title="エールコインを送る"
                >
                  <Coins className="w-4 h-4" />
                  エール送信
                </button>
              </div>
            </div>
          </div>
        )}

        {!isFullscreen && (
          <div className="mt-4 sm:mt-6 max-w-7xl mx-auto">
            <RecommendedVideos currentVideoId={id} category={video.category} />
          </div>
        )}
      </div>

      {/* ---- Paywall Modal（新・Stripe手数料外出し版） ----*/}
      {showPaywall && !hasPurchased && video && (
        <Preview30SecPaywallModal
          open={showPaywall}
          onOpenChange={(open) => setShowPaywall(open)}
          video={video}
          user={user}
          onPurchased={() => {
            setHasPurchased(true);
            unlock(); // ロック解除 → 再生再開可能に
            setShowPaywall(false);
          }}
        />
      )}
    </div>
  );
}