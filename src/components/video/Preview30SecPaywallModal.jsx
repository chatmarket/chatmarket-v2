import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Lock, CreditCard, AlertTriangle, Zap, Coins, Flame, Check } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

/**
 * 30秒プレビュー終了後の購入誘導モーダル（コイン決済専用）
 *
 * - ブラウザから Purchase.create / YellCoinWallet.update を直接呼び出さない
 * - purchaseVideoWithCoin Function 経由でサーバー側で安全に処理する
 */
export default function Preview30SecPaywallModal({
  open,
  onOpenChange,
  video,
  user,
  onPurchased,
}) {
  const [processing, setProcessing] = useState(false);
  const [wallet, setWallet] = useState(null);

  // ウォレット情報取得（残高確認表示用のみ）
  useEffect(() => {
    if (!user || !open || !video) return;
    base44.entities.YellCoinWallet.filter({ user_email: user.email }).then((w) => {
      setWallet(w[0] || null);
    });
  }, [user?.email, open, video?.id]);

  // モーダル開閉時に body overflow を制御
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  if (!video) return null;

  const coinPrice = video.price || 0; // Video.price = 必要コイン数（1:1）
  const hasEnoughCoins = wallet && wallet.balance >= coinPrice;

  // コイン購入（Function経由）
  const handleCoinPurchase = async () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    if (processing) return; // 二重クリック防止

    setProcessing(true);
    try {
      const res = await base44.functions.invoke("purchaseVideoWithCoin", { videoId: video.id });

      if (res.data?.ok || res.data?.alreadyPurchased) {
        toast.success("✅ 視聴権が解除されました！");
        onPurchased?.();
      } else if (res.data?.processing) {
        toast.info("処理中です。しばらくお待ちください。");
      } else if (res.data?.error === "insufficient_balance") {
        toast.error(`コイン残高が不足しています（必要: ${coinPrice.toLocaleString()}コイン）`);
      } else {
        toast.error(res.data?.error || "購入に失敗しました");
      }
    } catch (err) {
      toast.error("エラーが発生しました: " + (err.message || "不明なエラー"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-card to-secondary border-primary/40 max-w-sm sm:max-w-md shadow-2xl">
        <DialogHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
              <Lock className="w-7 h-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl sm:text-2xl">
            プレビューが終了しました
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 30秒プレビュー説明 */}
          <div className="bg-black/20 rounded-lg p-3 space-y-1">
            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              最初の30秒は無料プレビュー
            </p>
            <p className="text-sm text-foreground/80">
              続きを視聴するには、このビデオを購入してください
            </p>
          </div>

          {/* 価格 */}
          <div className="text-center space-y-1">
            <p className="text-muted-foreground text-xs">ビデオ購入価格</p>
            <p className="text-4xl font-black text-primary">
              {coinPrice.toLocaleString()}コイン
            </p>
          </div>

          {/* 残高表示 */}
          {wallet && (
            <div className={`rounded-lg p-3 text-xs text-center ${hasEnoughCoins ? "bg-green-500/10 border border-green-500/30 text-green-300" : "bg-orange-500/10 border border-orange-500/30 text-orange-300"}`}>
              🪙 現在の残高: {wallet.balance.toLocaleString()}コイン
              {!hasEnoughCoins && (
                <p className="mt-1 opacity-80">必要コイン: {coinPrice.toLocaleString()} コイン不足</p>
              )}
            </div>
          )}

          {/* 購入ボタン */}
          {!user ? (
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              className="w-full h-12 bg-primary hover:bg-primary/90 font-bold gap-2"
            >
              <CreditCard className="w-4 h-4" />
              ログインして購入
            </Button>
          ) : hasEnoughCoins ? (
            <div className="relative">
              <Button
                onClick={handleCoinPurchase}
                disabled={processing}
                className="w-full h-14 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-black text-base gap-2 rounded-xl"
              >
                {processing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {coinPrice.toLocaleString()}コインで購入
                  </>
                )}
              </Button>
              <span className="absolute -top-2.5 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Flame className="w-3 h-3" />
                推奨！最速
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <Button disabled className="w-full h-14 font-black text-base gap-2 rounded-xl opacity-50 cursor-not-allowed">
                <Coins className="w-5 h-5" />
                残高不足（{coinPrice.toLocaleString()}コイン必要）
              </Button>
              <Link to="/coin-charge">
                <Button
                  variant="outline"
                  className="w-full h-11 font-bold gap-2 border-yellow-500/40 hover:border-yellow-500/70 rounded-xl text-yellow-400"
                >
                  <Coins className="w-4 h-4" />
                  コインをチャージする
                </Button>
              </Link>
            </div>
          )}

          {/* 注意事項 */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2.5 flex items-start gap-2 text-[10px] text-orange-300">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              購入完了後、ブラウザを閉じずにお待ちください。動画再生が自動的に再開されます。
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}