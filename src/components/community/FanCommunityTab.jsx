import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Send, Lock, Loader2, X, Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function FanCommunityTab({ channel, currentUser, isOwner, isFollower }) {
  const [showComposer, setShowComposer] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [posting, setPosting] = useState(false);
  const queryClient = useQueryClient();

  const { data: posts = [] } = useQuery({
    queryKey: ["fan-community-posts", channel.id],
    queryFn: () => base44.entities.CommunityPost.filter({ channel_id: channel.id }, "-created_date"),
    enabled: !!channel.id,
  });

  const { data: comments = {} } = useQuery({
    queryKey: ["fan-community-comments", channel.id],
    queryFn: async () => {
      const allComments = await base44.entities.CommunityComment.filter({ post_id: { $regex: channel.id } });
      return allComments.reduce((acc, c) => {
        if (!acc[c.post_id]) acc[c.post_id] = [];
        acc[c.post_id].push(c);
        return acc;
      }, {});
    },
    enabled: !!channel.id,
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      if (!postContent.trim()) {
        toast.error("投稿内容を入力してください");
        return;
      }

      setPosting(true);

      let imageUrl = "";
      if (imageFile) {
        const res = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = res.file_url;
      }

      await base44.entities.CommunityPost.create({
        channel_id: channel.id,
        channel_name: channel.name,
        channel_avatar: channel.avatar_url,
        author_email: currentUser.email,
        author_name: currentUser.full_name || currentUser.email,
        content: postContent.trim(),
        image_url: imageUrl,
        visibility: "call-anser", // フォロワー限定
        like_count: 0,
        like_emails: [],
        comment_count: 0,
        is_pinned: false,
      });

      setPosting(false);
      setPostContent("");
      setImageFile(null);
      setSelectedImage(null);
      setShowComposer(false);
      toast.success("投稿しました！");
      queryClient.invalidateQueries({ queryKey: ["fan-community-posts", channel.id] });
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async (post) => {
      const isLiked = post.like_emails?.includes(currentUser.email);
      const newLikes = isLiked
        ? post.like_emails.filter((e) => e !== currentUser.email)
        : [...(post.like_emails || []), currentUser.email];

      await base44.entities.CommunityPost.update(post.id, {
        like_count: newLikes.length,
        like_emails: newLikes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fan-community-posts", channel.id] });
    },
  });

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setSelectedImage(ev.target?.result);
      reader.readAsDataURL(file);
      setImageFile(file);
    }
  };

  // フォロワー限定なので、オーナーまたはフォロワーのみ表示
  const canView = isOwner || isFollower;

  if (!canView) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-6 sm:p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="font-bold text-foreground">フォロワー限定コンテンツ</p>
          <p className="text-sm text-muted-foreground mt-1">このチャンネルをフォローして、限定の投稿を見よう！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 投稿作成フォーム（オーナーのみ） */}
      {isOwner && (
        <div className="bg-card rounded-xl border border-border/50 p-4 sm:p-5 space-y-3">
          {!showComposer ? (
            <button
              onClick={() => setShowComposer(true)}
              className="w-full flex items-center gap-3 bg-secondary rounded-lg px-4 py-3 hover:bg-secondary/80 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                {channel.avatar_url ? (
                  <img src={channel.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span className="text-xs font-bold text-primary">{channel.name?.[0]}</span>
                )}
              </div>
              <span className="text-muted-foreground text-sm">フォロワーに投稿する...</span>
            </button>
          ) : (
            <div className="space-y-3">
              <Textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="フォロワー限定のニュースやオフショットを共有しましょう"
                className="bg-secondary border-0 resize-none"
                rows={4}
              />

              {/* Image preview */}
              {selectedImage && (
                <div className="relative rounded-lg overflow-hidden max-h-48">
                  <img src={selectedImage} alt="" className="w-full object-cover max-h-48" />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setImageFile(null);
                    }}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white p-1 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between">
                <label className="cursor-pointer text-primary hover:text-primary/80 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <ImageIcon className="w-5 h-5" />
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setShowComposer(false);
                      setPostContent("");
                      setImageFile(null);
                      setSelectedImage(null);
                    }}
                  >
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => createPostMutation.mutate()}
                    disabled={posting || !postContent.trim()}
                    className="gap-2 bg-primary hover:bg-primary/90"
                  >
                    {posting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    投稿する
                  </Button>
                </div>
              </div>

              {/* Visibility badge */}
              <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 rounded-lg px-2.5 py-1.5 w-fit">
                <Lock className="w-3 h-3" />
                <span>フォロワー限定</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Posts list */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border/50">
            <p className="text-muted-foreground text-sm">まだ投稿がありません</p>
          </div>
        ) : (
          posts.map((post) => {
            const isLiked = post.like_emails?.includes(currentUser?.email);
            const postComments = comments[post.id] || [];

            return (
              <div key={post.id} className="bg-card rounded-xl border border-border/50 overflow-hidden">
                {/* Post header */}
                <div className="p-4 sm:p-5 flex items-start gap-3 border-b border-border/50">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                    {post.channel_avatar ? (
                      <img src={post.channel_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{post.channel_name?.[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm">{post.channel_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {post.created_date && new Date(post.created_date).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                </div>

                {/* Post content */}
                <div className="p-4 sm:p-5 space-y-3">
                  <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{post.content}</p>

                  {/* Image */}
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-full rounded-lg max-h-96 object-cover"
                    />
                  )}

                  {/* Visibility badge */}
                  <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 rounded-lg px-2.5 py-1.5 w-fit">
                    <Lock className="w-3 h-3" />
                    <span>フォロワー限定</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 sm:px-5 py-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
                  <button
                    onClick={() => currentUser ? toggleLikeMutation.mutate(post) : base44.auth.redirectToLogin()}
                    className={`flex items-center gap-1.5 transition-colors ${
                      isLiked ? "text-red-500 font-semibold" : "hover:text-foreground"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                    {post.like_count}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    {postComments.length}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}