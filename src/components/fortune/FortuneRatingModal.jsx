/**
 * FortuneRatingModal — 鑑定完了後の5段階評価モーダル
 * 使い方: <FortuneRatingModal thread={thread} channel={channel} user={user} onClose={fn} />
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const PRESET_TAGS = ["当たった！", "親切丁寧", "的確なアドバイス", "また相談したい", "分かりやすい", "霊感が鋭い"];

export default function FortuneRatingModal({ thread, channel, user, onClose }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("星をタップして評価してください"); return; }
    setSubmitting(true);
    try {
      // 1. レビュー保存
      await base44.entities.FortuneReview.create({
        channel_id: channel.id,
        channel_owner_email: channel.owner_email,
        reviewer_email: user.email,
        reviewer_name: user.full_name || user.email,
        session_type: "fortune_chat",
        session_id: thread.id,
        rating,
        comment: comment.trim() || undefined,
        tags: selectedTags,
      });

      // 2. Channel の avg_rating / review_count を更新
      const allReviews = await base44.entities.FortuneReview.filter({ channel_id: channel.id });
      const count = allReviews.length;
      const avg = count > 0
        ? Math.round((allReviews.reduce((s, r) => s + (r.rating || 0), 0) / count) * 10) / 10
        : rating;

      await base44.entities.Channel.update(channel.id, {
        avg_rating: avg,
        review_count: count,
      });

      toast.success("評価を送信しました！ありがとうございます 🌟");
      onClose();
    } catch (err) {
      toast.error("送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hovered || rating;
  const ratingLabels = ["", "イマイチ", "もう少し", "良かった", "とても良かった", "最高！"];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm rounded-3xl p-6 space-y-5"
          style={{
            background: "linear-gradient(145deg, #0D0A1A, #14082A)",
            border: "1px solid rgba(212,175,55,0.4)",
            boxShadow: "0 0 60px rgba(168,85,247,0.2), 0 0 120px rgba(212,175,55,0.1)",
          }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-white text-lg">鑑定はいかがでしたか？</p>
              <p className="text-xs text-white/40 mt-0.5">{channel.name} の評価</p>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 占い師アバター */}
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
              {channel.avatar_url
                ? <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-lg font-black text-purple-300">{channel.name?.[0]}</span>}
            </div>
            <div>
              <p className="font-bold text-sm text-white">{channel.name}</p>
              <p className="text-[11px] text-white/40">チャット鑑定</p>
            </div>
          </div>

          {/* 星評価 */}
          <div className="space-y-2">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className="w-10 h-10"
                    fill={star <= displayRating ? "#D4AF37" : "transparent"}
                    stroke={star <= displayRating ? "#D4AF37" : "rgba(255,255,255,0.2)"}
                    strokeWidth={1.5}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm font-bold" style={{ color: "#D4AF37", minHeight: "1.25rem" }}>
              {ratingLabels[displayRating] || ""}
            </p>
          </div>

          {/* プリセットタグ */}
          <div className="space-y-2">
            <p className="text-xs text-white/40 font-bold">当てはまるものをタップ（任意）</p>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="text-[11px] font-bold px-3 py-1 rounded-full border transition-all"
                  style={
                    selectedTags.includes(tag)
                      ? { background: "rgba(212,175,55,0.2)", borderColor: "#D4AF37", color: "#D4AF37" }
                      : { background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)" }
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* コメント */}
          <div className="space-y-1.5">
            <p className="text-xs text-white/40 font-bold">コメント（任意）</p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 300))}
              placeholder="鑑定の感想をお聞かせください..."
              rows={3}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            />
            <p className="text-[10px] text-white/25 text-right">{comment.length}/300</p>
          </div>

          {/* 送信 */}
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #D4AF37, #A0760F)",
              color: "#0D0A1A",
              boxShadow: rating > 0 ? "0 0 20px rgba(212,175,55,0.4)" : "none",
            }}
          >
            <Send className="w-4 h-4" />
            {submitting ? "送信中..." : "評価を送信する"}
          </button>

          <button onClick={onClose} className="w-full text-center text-xs text-white/25 hover:text-white/45 transition-colors py-1">
            今はスキップ
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}