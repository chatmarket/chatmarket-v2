import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export default function CommentSection({ targetType, targetId, user }) {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: [`comments-${targetType}`, targetId],
    queryFn: () => base44.entities.Comment.filter({ target_type: targetType, target_id: targetId }, "-created_date"),
    enabled: !!targetId,
  });

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }

    setSubmitting(true);
    try {
      await base44.entities.Comment.create({
        content: commentText,
        target_type: targetType,
        target_id: targetId,
        user_name: user.nickname || user.full_name || user.email,
        user_email: user.email,
      });
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: [`comments-${targetType}`, targetId] });
      toast.success("コメントを投稿しました");
    } catch (error) {
      toast.error("投稿に失敗しました");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="space-y-2">
        <h3 className="font-bold text-sm">コメント（{comments.length}）</h3>
        <form onSubmit={submitComment} className="flex gap-2">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="コメントを入力..."
            className="bg-secondary border-0 text-xs"
            maxLength={200}
            disabled={submitting}
          />
          <Button
            type="submit"
            size="icon"
            className="bg-primary hover:bg-primary/90 shrink-0"
            disabled={submitting || !commentText.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-4">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="bg-secondary rounded-lg p-3 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <UserIcon className="w-3 h-3 text-primary" />
                  </div>
                  <span className="font-semibold truncate">{comment.user_name}</span>
                  <span className="text-muted-foreground text-xs ml-auto shrink-0">
                    {new Date(comment.created_date).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-foreground/80 break-words">{comment.content}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-xs">
              コメントはまだありません
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}