import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Lock, Gem, CreditCard, Coins, CheckCircle, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function VaultPurchaseModal({ video, user, isPurchased, onClose, onPurchased }) {
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);
  const [done, setDone] = useState(false);

  const handleWatch = () => {
    onClose();
    navigate(`/watch/${video.id}`);
  };

  const handlePurchase = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    setPurchasing(true);
    try {
      await base44.entities.Purchase.create({
        item_type: "video",
        item_id: video.id,
        amount: video.price,
        buyer_email: user.email,
        status: "completed",
      });
      // ライブラリにも保存
      await base44.entities.Favorite.create({
        user_email: user.email,
        video_id: video.id,
        video_title: video.title,
        video_thumbnail: video.thumbnail_url || "",
        channel_id: video.channel_id,
        channel_name: video.channel_name || "",
        is_free: false,
        price: video.price || 0,
      }).catch(() => {});
      setDone(true);
      onPurchased?.();
      toast.success("購入完了！今すぐ視聴できます🎉");
    } catch (err) {
      toast.error("購入に失敗しました");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden border border-amber-500/30 shadow-2xl shadow-amber-500/10"
        style={{ background: "linear-gradient(160deg, #1a1208 0%, #0d0d0d 60%)" }}>
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 60px rgba(217,119,6,0.05)" }} />

        {/* Header */}
        <div className="relative px-6 py-5 border-b border-amber-500/20">
          <div className="flex items-center gap-2">
            <Gem className="w-5 h-5 text-amber-400" />
            <h2 className="font-black text-amber-300 text-lg">宝物庫</h2>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Thumbnail */}
          {video.thumbnail_url && (
            <div className="aspect-video rounded-xl overflow-hidden border border-amber-500/20">
              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="space-y-1">
            <h3 className="font-black text-xl leading-tight">{video.title}</h3>
            {video.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">{video.description}</p>
            )}
          </div>

          {/* Price */}
          {!isPurchased && !done && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-500/60 uppercase tracking-wider">購入価格</p>
                <p className="text-3xl font-black text-amber-300">¥{video.price?.toLocaleString()}</p>
              </div>
              <Lock className="w-8 h-8 text-amber-500/30" />
            </div>
          )}

          {/* Purchased state */}
          {(isPurchased || done) && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
              <div>
                <p className="font-bold text-green-300">購入済み</p>
                <p className="text-xs text-muted-foreground">この作品はあなたのライブラリにあります</p>
              </div>
            </div>
          )}

          {/* Actions */}
          {(isPurchased || done) ? (
            <Button onClick={handleWatch} className="w-full h-12 bg-primary hover:bg-primary/90 gap-2 font-bold text-base">
              <Play className="w-5 h-5" /> 今すぐ視聴する
            </Button>
          ) : !user ? (
            <Button onClick={() => base44.auth.redirectToLogin()} className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-black gap-2 font-black text-base">
              <CreditCard className="w-5 h-5" /> ログインして購入
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handlePurchase}
                disabled={purchasing}
                className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-black gap-2 font-black text-base"
              >
                {purchasing ? (
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <Gem className="w-5 h-5" />
                )}
                {purchasing ? "処理中..." : `¥${video.price?.toLocaleString()} で購入する`}
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                購入後はいつでも視聴可能。マイライブラリに保存されます。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}