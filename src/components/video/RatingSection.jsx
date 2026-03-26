import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { toast } from "sonner";

export default function RatingSection({ targetId, user }) {
  const [hoverRating, setHoverRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const queryClient = useQueryClient();

  const { data: ratings = [] } = useQuery({
    queryKey: [`ratings`, targetId],
    queryFn: () => base44.entities.VideoRating.filter({ video_id: targetId }),
    enabled: !!targetId,
  });

  useEffect(() => {
    if (!user || !ratings) return;
    const userRate = ratings.find((r) => r.user_email === user.email);
    if (userRate) setUserRating(userRate.score);
  }, [ratings, user]);

  const submitRating = useMutation({
    mutationFn: async (score) => {
      if (!user) {
        base44.auth.redirectToLogin();
        return;
      }
      const existing = ratings.find((r) => r.user_email === user.email);
      if (existing) {
        await base44.entities.VideoRating.update(existing.id, { score });
      } else {
        await base44.entities.VideoRating.create({
          video_id: targetId,
          user_email: user.email,
          score,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`ratings`, targetId] });
      toast.success("評価しました");
    },
    onError: () => {
      toast.error("評価に失敗しました");
    },
  });

  const avgRating = ratings.length > 0 ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1) : 0;

  return (
    <div className="space-y-2 bg-secondary rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">配信評価</p>
          <p className="text-2xl font-black text-primary">{avgRating}</p>
          <p className="text-xs text-muted-foreground">{ratings.length}件の評価</p>
        </div>
        <div className="flex gap-1 ml-auto">
          {[1, 2, 3, 4, 5].map((star) => (
            <Button
              key={star}
              variant="ghost"
              size="icon"
              className="p-0 w-6 h-6"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => submitRating.mutate(star)}
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  star <= (hoverRating || userRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}