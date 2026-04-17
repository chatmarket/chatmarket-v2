import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Lightbulb, Heart, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// CommunityPostのvisibility="public"、channel_id="wishlist_global"で共有掲示板として使用
const WISHLIST_CHANNEL = "wishlist_global";

export default function WishlistBoard({ channelId, userEmail, userName }) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [newWish, setNewWish] = useState("");
  const [posting, setPosting] = useState(false);

  const { data: wishes = [] } = useQuery({
    queryKey: ["wishlist-board", channelId],
    queryFn: () => base44.entities.CommunityPost.filter(
      { channel_id: channelId ? `wishlist_${channelId}` : WISHLIST_CHANNEL },
      "-like_count",
      20
    ),
    enabled: true,
  });

  const handlePost = async () => {
    if (!newWish.trim()) return;
    setPosting(true);
    await base44.entities.CommunityPost.create({
      channel_id: channelId ? `wishlist_${channelId}` : WISHLIST_CHANNEL,
      author_email: userEmail || "anonymous",
      author_name: userName || "匿名",
      content: newWish.trim(),
      visibility: "public",
      like_count: 0,
      like_emails: [],
    });
    setNewWish("");
    queryClient.invalidateQueries({ queryKey: ["wishlist-board", channelId] });
    toast.success("リクエストを投稿しました！");
    setPosting(false);
  };

  const handleLike = async (wish) => {
    if (!userEmail) return;
    const alreadyLiked = (wish.like_emails || []).includes(userEmail);
    if (alreadyLiked) return;
    await base44.entities.CommunityPost.update(wish.id, {
      like_count: (wish.like_count || 0) + 1,
      like_emails: [...(wish.like_emails || []), userEmail],
    });
    queryClient.invalidateQueries({ queryKey: ["wishlist-board", channelId] });
  };

  const displayWishes = expanded ? wishes : wishes.slice(0, 3);

  return (
    <div className="rounded-2xl border border-amber-400/25 p-5 space-y-4"
      style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.06), rgba(245,158,11,0.03))" }}>

      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-amber-400" />
        <div className="flex-1">
          <p className="text-xs font-black text-amber-400 uppercase tracking-widest">ファンのウィッシュリスト</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">「こんな配信をしてほしい」というリクエスト掲示板</p>
        </div>
        <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 font-bold">
          {wishes.length}件
        </span>
      </div>

      {/* リクエスト投稿フォーム */}
      <div className="flex gap-2">
        <Input
          value={newWish}
          onChange={e => setNewWish(e.target.value)}
          placeholder="例: 英語学習のコツを教えてください"
          className="bg-background/60 border-amber-500/20 text-sm h-9"
          onKeyDown={e => e.key === "Enter" && handlePost()}
          maxLength={100}
        />
        <Button
          size="sm"
          onClick={handlePost}
          disabled={posting || !newWish.trim()}
          className="shrink-0 bg-amber-500 hover:bg-amber-400 text-black font-bold h-9 px-3"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* ウィッシュ一覧 */}
      {wishes.length === 0 ? (
        <div className="text-center py-4 text-xs text-muted-foreground">
          まだリクエストがありません。最初の投稿者になりましょう！
        </div>
      ) : (
        <div className="space-y-2">
          {displayWishes.map((wish, i) => {
            const liked = (wish.like_emails || []).includes(userEmail);
            return (
              <div key={wish.id} className="flex items-start gap-3 rounded-xl px-3 py-2.5 group"
                style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)" }}>
                <span className="text-sm font-black text-amber-500/60 w-5 shrink-0 pt-0.5">
                  {i + 1 <= 3 ? ["🥇","🥈","🥉"][i] : `${i+1}.`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/90 leading-relaxed">{wish.content}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{wish.author_name}</p>
                </div>
                <button
                  onClick={() => handleLike(wish)}
                  disabled={liked}
                  className={`flex items-center gap-1 shrink-0 transition-all ${liked ? "text-pink-400 cursor-default" : "text-muted-foreground hover:text-pink-400"}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${liked ? "fill-pink-400" : ""}`} />
                  <span className="text-[10px] font-bold">{wish.like_count || 0}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* もっと見る */}
      {wishes.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> 折りたたむ</> : <><ChevronDown className="w-3 h-3" /> 残り{wishes.length - 3}件を見る</>}
        </button>
      )}
    </div>
  );
}