import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PaywallModal({ video, user, onPurchased, onClose }) {
  const [purchasing, setPurchasing] = useState(false);
  const [purchased, setPurchased] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    setPurchasing(true);
    await base44.entities.Purchase.create({
      item_type: "video",
      item_id: video.id,
      amount: video.price,
      buyer_email: user.email,
      status: "completed",
    });

    // 購入済み動画をライブラリ（Favorite）に自動保存
    const existingFavs = await base44.entities.Favorite.filter({
      video_id: video.id,
      user_email: user.email,
    });
    if (existingFavs.length === 0) {
      await base44.entities.Favorite.create({
        user_email: user.email,
        video_id: video.id,
        video_title: video.title,
        video_thumbnail: video.thumbnail_url || "",
        channel_id: video.channel_id,
        channel_name: video.channel_name || "",
        is_free: false,
        price: video.price || 0,
      });
    }

    setPurchased(true);
    setPurchasing(false);
    setTimeout(() => {
      onPurchased();
      onClose();
    }, 1500);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm text-center">
        {purchased ? (
          <div className="py-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-primary mx-auto" />
            <h2 className="text-xl font-bold">購入完了！</h2>
            <p className="text-muted-foreground text-sm">動画の全編をお楽しみください</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <DialogTitle className="text-xl">この動画は有料です</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-muted-foreground text-sm">
                最初の30秒のプレビューが終了しました。続きを視聴するには購入が必要です。
              </p>

              <div className="bg-secondary rounded-xl p-4">
                <p className="text-sm text-muted-foreground">動画タイトル</p>
                <p className="font-semibold mt-1">{video.title}</p>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-2xl font-bold text-primary">
                    ¥{video.price?.toLocaleString()}
                  </p>
                </div>
              </div>

              <Button
                onClick={handlePurchase}
                disabled={purchasing}
                className="w-full bg-primary hover:bg-primary/90 gap-2 h-12 text-base"
              >
                <CreditCard className="w-5 h-5" />
                {purchasing ? "処理中..." : "購入する"}
              </Button>

              <p className="text-[11px] text-muted-foreground">
                ※ 購入後はいつでも視聴可能です
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}