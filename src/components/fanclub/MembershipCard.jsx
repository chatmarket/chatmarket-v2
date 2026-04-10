import React, { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Video, Archive, Phone, Sparkles, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BENEFITS = [
  { icon: Video, label: "コミュニティ限定生配信", desc: "会員専用のプレミアムライブ配信に参加できます" },
  { icon: Archive, label: "アーカイブ動画見放題", desc: "過去の限定配信をすべて視聴可能です" },
  { icon: Phone, label: "1on1ビデオ通話 優待イベント参加権", desc: "クリエイターと直接話せる特別イベント" },
];

export default function MembershipCard({ isMember, onJoin }) {
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    onJoin();
    toast.success("ファンクラブへようこそ！🎉 会員登録が完了しました");
  };

  if (isMember) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-2xl p-6 border border-yellow-500/40"
        style={{ background: "linear-gradient(135deg, #1a1400 0%, #2a1f00 50%, #1a1000 100%)" }}
      >
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(45deg, #ffd700 0, #ffd700 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }} />
        <div className="absolute top-3 right-3">
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
          </div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
              <Crown className="w-6 h-6 text-black" />
            </div>
            <div>
              <p className="text-xs tracking-[0.3em] uppercase text-yellow-400/80">Digital Member Card</p>
              <p className="text-xl font-black text-yellow-400" style={{ textShadow: "0 0 20px rgba(255,215,0,0.5)" }}>PREMIUM FAN</p>
            </div>
          </div>
          <div className="bg-black/30 rounded-xl p-4 space-y-2 mb-4 border border-yellow-500/20">
            <p className="text-xs text-yellow-400/60 tracking-widest">MEMBER BENEFITS ACTIVE</p>
            {BENEFITS.map((b, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-yellow-100/80">
                <Check className="w-4 h-4 text-yellow-400 shrink-0" />
                {b.label}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border">会員ステータス: アクティブ</Badge>
            <p className="text-xs text-yellow-400/50">¥3,300 / 月</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-yellow-500/20"
      style={{ background: "linear-gradient(135deg, #0f0f0f 0%, #1a1400 100%)" }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600" />
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-500/40 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="font-black text-lg text-yellow-400">プレミアム ファンクラブ</p>
              <p className="text-xs text-muted-foreground">限定特典で特別な体験を</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-yellow-400">¥3,300</p>
            <p className="text-xs text-muted-foreground">/ 月（税込）</p>
          </div>
        </div>

        <div className="space-y-3">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-3"
            >
              <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                <b.icon className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-yellow-100">{b.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <Button
          onClick={handleJoin}
          disabled={loading}
          className="w-full h-12 text-base font-bold gap-2 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #b8860b, #ffd700, #b8860b)", color: "#000" }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              ファンクラブに参加する
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}