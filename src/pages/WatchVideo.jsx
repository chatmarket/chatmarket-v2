import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ChatPanel from "../components/chat/ChatPanel";
import PaywallModal from "../components/video/PaywallModal";
import { Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import VideoComments from "../components/video/VideoComments";

const FREE_PREVIEW_SECONDS = 30;

export default function WatchVideo() {
  const { id } = useParams();
  const videoRef = useRef(null);
  const [user, setUser] = useState(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [previewEnded, setPreviewEnded] = useState(false);
  const queryClient = useQueryClient();

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

  // Increment view count
  useEffect(() => {
    if (video) {
      base44.entities.Video.update(video.id, {
        view_count: (video.view_count || 0) + 1,
      });
    }
  }, [video?.id]);

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

            {/* SAMPLE watermark */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <span className="text-white/30 text-6xl font-black" style={{ transform: "rotate(-45deg)", whiteSpace: "nowrap" }}>
                SAMPLE
              </span>
            </div>

            {/* Preview indicator */}
            {isPaid && !hasPurchased && !previewEnded && (
              <div className="absolute top-3 right-3 bg-black/80 text-white px-3 py-1 rounded-full text-xs font-medium">
                30秒プレビュー中
              </div>
            )}
          </div>

          {/* Video info */}
          <div className="space-y-3">
            <h1 className="text-xl md:text-2xl font-bold">{video.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {video.view_count || 0} 回視聴
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {video.created_date && format(new Date(video.created_date), "yyyy/MM/dd")}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {video.channel_name}
              </span>
            </div>
            {video.description && (
              <div className="bg-card rounded-xl p-4 border border-border/50">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{video.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat */}
        <div className="lg:col-span-1 h-[500px] lg:h-[calc(100vh-8rem)]">
          <ChatPanel targetType="video" targetId={id} />
        </div>
      </div>

      {/* Comments section */}
      <div className="max-w-3xl mt-4">
        <VideoComments videoId={id} user={user} />
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