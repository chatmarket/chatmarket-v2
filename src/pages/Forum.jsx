import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Plus, ThumbsUp, Tag, X, Send, ChevronDown, ChevronUp, ShieldCheck, Flag, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

// トリップ生成：パスワードをSHA-256でハッシュ化し先頭8文字を返す
async function generateTrip(password) {
  if (!password) return "";
  const encoded = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return "◆" + hashHex.slice(0, 8).toUpperCase();
}

const TAGS = ["機材・環境", "OBS設定", "音声トラブル", "配信テクニック", "収益化", "雑談"];

const REPORT_REASONS = ["個人情報", "卑猥・わいせつ", "誹謗中傷", "スパム", "その他"];

function PostCard({ post, user, onLike }) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyTrip, setReplyTrip] = useState("");
  const [replyHandle, setReplyHandle] = useState("");
  const [showReplyTrip, setShowReplyTrip] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetail, setReportDetail] = useState("");
  const [reporting, setReporting] = useState(false);
  const queryClient = useQueryClient();

  const replies = post.replies || [];

  const handleReport = async () => {
    if (!reportReason) return;
    if (!user) { base44.auth.redirectToLogin(); return; }
    setReporting(true);
    try {
      await base44.functions.invoke("forumPost", {
        action: "report",
        post_id: post.id,
        reason: reportReason,
        detail: reportDetail,
      });
      toast.success("通報を受け付けました。運営が確認します。");
      setShowReportModal(false);
      setReportReason("");
      setReportDetail("");
    } catch {
      toast.error("通報に失敗しました");
    }
    setReporting(false);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    if (!user) { base44.auth.redirectToLogin(); return; }
    setSubmitting(true);
    const trip = replyTrip ? await generateTrip(replyTrip) : "";
    const displayName = replyHandle.trim() || user.full_name || user.email;
    // スレ主トリップと一致するか確認
    const isOp = trip && trip === post.trip;
    const updated = [...replies, {
      author: displayName,
      trip,
      is_op: isOp,
      email: user.email,
      content: replyText.trim(),
      created_at: new Date().toISOString(),
    }];
    await base44.entities.BlogPost.update(post.id, { replies: updated });
    queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
    setReplyText("");
    setReplyTrip("");
    setReplyHandle("");
    setShowReplyTrip(false);
    setSubmitting(false);
    setExpanded(true);
    toast.success(isOp ? "スレ主として返信しました ✓" : "返信しました");
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
              {post.trip && (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />{post.trip}
                </span>
              )}
              <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">スレ主</span>
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
          {/* 通報ボタン */}
          <button
            onClick={() => { if (!user) { base44.auth.redirectToLogin(); return; } setShowReportModal(true); }}
            className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-red-400 transition-colors ml-auto"
            title="この投稿を通報する"
          >
            <Flag className="w-3.5 h-3.5" />
            {post.report_count > 0 && <span className="text-red-400">{post.report_count}</span>}
          </button>
        </div>
      </div>

      {/* 通報モーダル */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" /> 投稿を通報する
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-zinc-400">「{post.title}」を通報します。運営が確認し対応します。</p>
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-zinc-400">通報理由</p>
              <div className="flex flex-wrap gap-2">
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReportReason(r)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all font-semibold ${
                      reportReason === r
                        ? "border-red-500 bg-red-500/20 text-red-400"
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={reportDetail}
              onChange={(e) => setReportDetail(e.target.value)}
              placeholder="詳細（任意）"
              rows={2}
              className="w-full bg-zinc-800 border-0 rounded-lg px-3 py-2 text-xs text-white placeholder:text-zinc-600 resize-none focus:outline-none focus:ring-1 focus:ring-red-500/50"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-zinc-700" onClick={() => setShowReportModal(false)}>キャンセル</Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReport}
                disabled={!reportReason || reporting}
              >
                {reporting ? "送信中..." : "通報する"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Replies */}
      {expanded && (
        <div className="border-t border-zinc-800 bg-zinc-950 px-5 py-4 space-y-3">
          {replies.map((r, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-400">
                {(r.author || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-zinc-300">{r.author || "匿名"}</span>
                  {r.trip && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 ${
                      r.is_op
                        ? "text-amber-400 bg-amber-500/10 border border-amber-500/30"
                        : "text-zinc-500 bg-zinc-800"
                    }`}>
                      {r.is_op && <ShieldCheck className="w-2.5 h-2.5" />}
                      {r.trip}
                    </span>
                  )}
                  {r.is_op && (
                    <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">スレ主</span>
                  )}
                  <span className="text-[10px] text-zinc-600">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ja })}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{r.content}</p>
              </div>
            </div>
          ))}

          {/* Reply input */}
          <div className="pt-2 border-t border-zinc-800 space-y-2">
            <div className="flex gap-2">
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={user ? "返信を書く..." : "返信するにはログインが必要です"}
                disabled={!user}
                className="bg-zinc-800 border-0 text-sm h-8"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleReply()}
              />
              <button
                type="button"
                onClick={() => setShowReplyTrip(v => !v)}
                className={`text-[10px] px-2 rounded font-bold border transition-all shrink-0 ${showReplyTrip ? "border-amber-500/50 text-amber-400 bg-amber-500/10" : "border-zinc-700 text-zinc-500 hover:border-zinc-500"}`}
                title="固定ハンドル"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </button>
              <Button size="sm" disabled={submitting || !replyText.trim() || !user} onClick={handleReply} className="h-8 px-3">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
            {showReplyTrip && (
              <div className="flex gap-2">
                <Input
                  value={replyHandle}
                  onChange={e => setReplyHandle(e.target.value)}
                  placeholder="ハンドル名（省略可）"
                  className="bg-zinc-900 border border-zinc-700 text-xs h-7"
                />
                <Input
                  value={replyTrip}
                  onChange={e => setReplyTrip(e.target.value)}
                  type="password"
                  placeholder="トリップキー（パスワード）"
                  className="bg-zinc-900 border border-zinc-700 text-xs h-7"
                />
              </div>
            )}
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
  const [form, setForm] = useState({ title: "", content: "", tag: "", handle: "", tripKey: "" });
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
    const trip = form.tripKey ? await generateTrip(form.tripKey) : "";
    const authorName = form.handle.trim() || user.full_name || user.email;
    try {
      const res = await base44.functions.invoke("forumPost", {
        action: "create",
        title: form.title.trim(),
        content: form.content.trim(),
        tag: form.tag || null,
        author_name: authorName,
        trip,
      });
      if (res.data?.error === "ng_word") {
        toast.error(res.data.message);
        setSubmitting(false);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      setForm({ title: "", content: "", tag: "", handle: "", tripKey: "" });
      setShowForm(false);
      toast.success("投稿しました！");
    } catch (err) {
      // NGワードエラーはレスポンス本文にある
      const msg = err?.response?.data?.message;
      if (msg) { toast.error(msg); }
      else { toast.error("投稿に失敗しました"); }
    }
    setSubmitting(false);
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
          <div className="flex gap-2">
            <Input
              value={form.handle}
              onChange={(e) => setForm({ ...form, handle: e.target.value })}
              placeholder="ハンドル名（省略時はアカウント名）"
              className="bg-zinc-800 border-0 flex-1"
              maxLength={30}
            />
            <Input
              value={form.tripKey}
              onChange={(e) => setForm({ ...form, tripKey: e.target.value })}
              type="password"
              placeholder="トリップキー（スレ主証明用パスワード）"
              className="bg-zinc-800 border-0 flex-1"
            />
          </div>
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