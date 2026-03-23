import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { t } from "@/lib/i18n";

export default function VideoComments({ videoId, user }) {
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", "video", videoId],
    queryFn: () => base44.entities.Comment.filter({ target_type: "video", target_id: videoId }, "-created_date", 50),
    refetchInterval: 10000,
  });

  const postComment = useMutation({
    mutationFn: (content) =>
      base44.entities.Comment.create({
        content,
        target_type: "video",
        target_id: videoId,
        user_name: user?.full_name || "匿名",
        user_email: user?.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", "video", videoId] });
      setNewComment("");
    },
  });

  return (
    <div className="space-y-4 mt-6">
      <h3 className="font-bold text-lg">{t("comments")} ({comments.length})</h3>

      {user && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
            <span className="text-xs font-bold text-primary">{user.full_name?.[0] || "?"}</span>
          </div>
          <div className="flex-1 space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t("addComment")}
              className="bg-secondary border-0 resize-none"
              rows={2}
            />
            <Button
              size="sm"
              onClick={() => postComment.mutate(newComment.trim())}
              disabled={!newComment.trim()}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Send className="w-3.5 h-3.5" /> {t("postComment")}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <span className="text-xs font-bold">{c.user_name?.[0] || "?"}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">{c.user_name}</p>
              <p className="text-sm text-foreground/80 mt-0.5">{c.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(c.created_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground">まだコメントはありません</p>
        )}
      </div>
    </div>
  );
}