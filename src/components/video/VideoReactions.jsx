import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Star } from "lucide-react";
import { toast } from "sonner";

export default function VideoReactions({ videoId, user }) {
  const queryClient = useQueryClient();

  const { data: likes = [] } = useQuery({
    queryKey: ["reactions", videoId],
    queryFn: () => base44.entities.VideoReaction.filter({ video_id: videoId, type: "like" }),
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ["ratings", videoId],
    queryFn: () => base44.entities.VideoRating.filter({ video_id: videoId }),
  });

  const myLike = likes.find((r) => r.user_email === user?.email);
  const myRating = ratings.find((r) => r.user_email === user?.email);
  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
    : null;

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (myLike) {
        await base44.entities.VideoReaction.delete(myLike.id);
      } else {
        await base44.entities.VideoReaction.create({
          video_id: videoId,
          user_email: user.email,
          type: "like",
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reactions", videoId] }),
  });

  const submitRating = useMutation({
    mutationFn: async (score) => {
      if (myRating) {
        await base44.entities.VideoRating.update(myRating.id, { score });
      } else {
        await base44.entities.VideoRating.create({
          video_id: videoId,
          user_email: user.email,
          score,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ratings", videoId] });
      toast.success("評価を送信しました");
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-4 py-3 border-t border-b border-border/50">
      {/* Like button */}
      <button
        onClick={() => {
          if (!user) { toast.error("ログインが必要です"); return; }
          toggleLike.mutate();
        }}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          myLike
            ? "bg-primary text-primary-foreground"
            : "bg-secondary hover:bg-secondary/80 text-foreground"
        }`}
      >
        <ThumbsUp className="w-4 h-4" />
        いいね {likes.length > 0 && <span>{likes.length}</span>}
      </button>

      {/* Star rating */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => {
                if (!user) { toast.error("ログインが必要です"); return; }
                submitRating.mutate(star);
              }}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-5 h-5 ${
                  (myRating?.score ?? 0) >= star
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>
        {avgRating && (
          <span className="text-sm text-muted-foreground">
            {avgRating} <span className="text-xs">({ratings.length}件)</span>
          </span>
        )}
      </div>
    </div>
  );
}