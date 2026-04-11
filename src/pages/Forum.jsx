import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus, ThumbsUp, Tag, X, Send, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

const TAGS = ["機材・環境", "OBS設定", "音声トラブル", "配信テクニック", "収益化", "雑談"];

function PostCard({ post, user, onLike }) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const replies = post.replies || [];

  const handleReply = async () => {
    if (!replyText.trim()) return;
    if (!user) { base44.auth.redirectToLogin(); return; }
    setSubmitting(true);
    const updated = [...replies, {
      author: user.full_name || user.email,
      email: user.email,
      content: replyText.trim(),
      created_at: new Date().toISOString(),
    }];
    await base44.entities.BlogPost.update(post.id, { replies: updated });
    queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
    setReplyText("");
    setSubmitting(false);
    setExpanded(true);
    toast.success("返信しました");
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 font-black text-primary text-sm">
            {(post.author_name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white">{post.author_name || "匿名"}</span>
              {post.tag && (
                <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" />{post.tag}
                </span>
              )}
              <span className="text-xs text-zinc-600 ml-auto">
                {formatDistanceToNow(new Date(post.created_date), { addSuffix: true, locale: ja })}
              </span>
            </div>
            <h3 className="font-black text-white mt-1">{post.title}</h3>
          </div>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">{post.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => onLike(post)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-primary transition-colors"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{post.likes || 0}</span>
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-blue-400 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{replies.length}件の返信</span>
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Replies */}
      {expanded && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-5 py-4 space-y-3">
          {replies.map((r, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-400">
                {(r.author || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-300">{r.author || "匿名"}</span>
                  <span className="text-[10px] text-zinc-600">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ja })}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{r.content}</p>
              </div>
            </div>
          ))}

          {/* Reply input */}
          <div className="flex gap-2 pt-2 border-t border-zinc-800">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={user ? "返信を書く..." : "返信するにはログインが必要です"}
              disabled={!user}
              className="bg-zinc-800 border-0 text-sm h-8"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
            />
            <Button size="sm" disabled={submitting || !replyText.trim() || !user} onClick={handleReply} className="h-8 px-3">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Forum() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", tag: "" });
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: posts = [] } = useQuery({
    queryKey: ["forum-posts"],
    queryFn: () => base44.entities.BlogPost.filter({ post_type: "forum" }, "-created_date", 50),
  });

  const filtered = selectedTag ? posts.filter((p) => p.tag === selectedTag) : posts;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    if (!user) { base44.auth.redirectToLogin(); return; }
    setSubmitting(true);
    await base44.entities.BlogPost.create({
      title: form.title.trim(),
      content: form.content.trim(),
      tag: form.tag || null,
      author_name: user.full_name || user.email,
      author_email: user.email,
      post_type: "forum",
      likes: 0,
      replies: [],
    });
    queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
    setForm({ title: "", content: "", tag: "" });
    setShowForm(false);
    setSubmitting(false);
    toast.success("投稿しました！");
  };

  const handleLike = async (post) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    await base44.entities.BlogPost.update(post.id, { likes: (post.likes || 0) + 1 });
    queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary" /> クリエイター掲示板
          </h1>
          <p className="text-zinc-500 text-sm mt-1">機材・配信技術・収益化について気軽に質問・共有しよう</p>
        </div>
        <Button
          onClick={() => { if (!user) { base44.auth.redirectToLogin(); return; } setShowForm(!showForm); }}
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "閉じる" : "投稿する"}
        </Button>
      </div>

      {/* Post form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-white">新規投稿</h2>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="タイトル（例：OBSで音が割れる時の対処法）"
            className="bg-zinc-800 border-0"
            maxLength={100}
          />
          <Textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="詳しく書いてみよう..."
            className="bg-zinc-800 border-0 resize-none"
            rows={4}
            maxLength={1000}
          />
          {/* Tag selector */}
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, tag: form.tag === t ? "" : t })}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all font-semibold ${
                  form.tag === t
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Button type="submit" disabled={submitting || !form.title.trim() || !form.content.trim()} className="w-full bg-primary hover:bg-primary/90">
            {submitting ? "投稿中..." : "投稿する"}
          </Button>
        </form>
      )}

      {/* Tag filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTag(null)}
          className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${!selectedTag ? "border-primary bg-primary/20 text-primary" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}
        >
          すべて
        </button>
        {TAGS.map((t) => (
          <button
            key={t}
            onClick={() => setSelectedTag(selectedTag === t ? null : t)}
            className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${selectedTag === t ? "border-primary bg-primary/20 text-primary" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Posts */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">まだ投稿がありません。最初の一言を投稿しましょう！</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} user={user} onLike={handleLike} />
          ))}
        </div>
      )}
    </div>
  );
}