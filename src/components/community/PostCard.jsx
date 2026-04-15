import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, MessageCircle, Lock, Pin, Image, ChevronDown, ChevronUp, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

const VISIBILITY_LABELS = {
  public: null,
  basic: { label: "BASIC限定", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  "call-anser": { label: "CALL&ANSER限定", color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30" },
  vod: { label: "VOD限定", color: "text-primary bg-primary/15 border-primary/30" },
  ppv: { label: "PPV限定", color: "text-red-400 bg-red-500/15 border-red-500/30" },
};

export default function PostCard({ post, user, userPlans, channelOwnerEmail }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const qc = useQueryClient();

  const isLiked = post.like_emails?.includes(user?.email);
  const isAuthor = post.author_email === user?.email;
  const isChannelOwner = user && channelOwnerEmail && user.email === channelOwnerEmail;
  const isAdmin = user?.role === "admin";
  const canDelete = isAuthor || isChannelOwner || isAdmin;
  const badge = VISIBILITY_LABELS[post.visibility];

  const { data: comments = [] } = useQuery({
    queryKey: ["community-comments", post.id],
    queryFn: () => base44.entities.CommunityComment.filter({ post_id: post.id }, "created_date", 50),
    enabled: showComments,
  });

  const toggleLike = async () => {
    if (!user) { toast.error("ログインが必要です"); return; }
    const newLikes = isLiked
      ? (post.like_emails || []).filter(e => e !== user.email)
      : [...(post.like_emails || []), user.email];
    await base44.entities.CommunityPost.update(post.id, {
      like_emails: newLikes,
      like_count: newLikes.length,
    });
    qc.invalidateQueries({ queryKey: ["community-posts"] });
  };

  const submitComment = async () => {
    if (!commentText.trim() || !user) return;
    await base44.entities.CommunityComment.create({
      post_id: post.id,
      author_email: user.email,
      author_name: user.full_name || user.email,
      content: commentText.trim(),
      like_count: 0,
      like_emails: [],
    });
    await base44.entities.CommunityPost.update(post.id, {
      comment_count: (post.comment_count || 0) + 1,
    });
    setCommentText("");
    qc.invalidateQueries({ queryKey: ["community-comments", post.id] });
    qc.invalidateQueries({ queryKey: ["community-posts"] });
  };

  const deletePost = async () => {
    if (!window.confirm("この投稿を削除しますか？")) return;
    await base44.entities.CommunityPost.delete(post.id);
    qc.invalidateQueries({ queryKey: ["community-posts"] });
    toast.success("投稿を削除しました");
  };

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all ${post.is_pinned ? "border-primary/50 shadow-lg shadow-primary/10" : "border-border/50"}`}>
      {post.is_pinned && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 flex items-center gap-1.5 text-xs text-primary font-bold">
          <Pin className="w-3 h-3" /> ピン留め投稿
        </div>
      )}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
              {post.channel_avatar
                ? <img src={post.channel_avatar} alt="" className="w-full h-full object-cover" />
                : <span className="text-sm font-bold">{(post.author_name || "?")[0]}</span>}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{post.author_name || post.author_email}</p>
              <p className="text-xs text-muted-foreground">
                {post.created_date && formatDistanceToNow(new Date(post.created_date), { addSuffix: true, locale: ja })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.color}`}>
                <Lock className="w-2.5 h-2.5" />{badge.label}
              </span>
            )}
            {canDelete && (
              <button onClick={deletePost} className="text-muted-foreground hover:text-destructive transition-colors" title="投稿を削除">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {post.image_url && (
          <img src={post.image_url} alt="" className="rounded-xl w-full max-h-80 object-cover" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-1 border-t border-border/30">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${isLiked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-red-400" : ""}`} />
            <span className="font-semibold">{post.like_count || 0}</span>
          </button>
          <button
            onClick={() => setShowComments(v => !v)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="font-semibold">{post.comment_count || 0}</span>
            {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="space-y-3 pt-2 border-t border-border/30">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                  {(c.author_name || "?")[0]}
                </div>
                <div className="flex-1 bg-secondary rounded-xl px-3 py-2">
                  <p className="text-xs font-bold text-muted-foreground mb-0.5">{c.author_name}</p>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
            ))}
            {user && (
              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value.slice(0, 200))}
                  placeholder="コメントを入力..."
                  className="bg-secondary border-0 resize-none text-sm min-h-0 h-10 py-2"
                  rows={1}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                />
                <Button size="icon" onClick={submitComment} disabled={!commentText.trim()} className="shrink-0 h-10 w-10">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}