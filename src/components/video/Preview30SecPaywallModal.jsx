import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Lock, CreditCard, DollarSign, AlertTriangle, Zap, Coins, Flame, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * 30秒プレビュー終了後の購入誘導モーダル
 * 
 * 機能：
 * - Stripe手数料を外出し表示（透明性ガード）
 * - 「購入ボタン」→ Stripe決済 → 購入完了時にシームレス再開
 * - モーダル表示中はスクロール・背景操作完全ロック
 */
export default function Preview30SecPaywallModal({
  open,
  onOpenChange,
  video,
  user,
  onPurchased,
}) {
  const [processing, setProcessing] = useState(false);
  const [coinProcessing, setCoinProcessing] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null); // "coin" | "stripe"

  // ウォレット情報取得
  useEffect(() => {
    if (!user || !open || !video) return;
    base44.entities.YellCoinWallet.filter({ user_email: user.email }).then((w) => {
      setWallet(w[0] || null);
    });
  }, [user?.email, open, video?.id]);

  if (!video) return null;

  // Stripe手数料計算（固定: 3.6% + ¥0.40）
  const STRIPE_RATE = 0.036;
  const STRIPE_FIXED = 40; // 40円
  const stripeFee = Math.round(video.price * STRIPE_RATE + STRIPE_FIXED);
  const totalCharge = video.price + stripeFee;

  // エールコイン決済（残高確認 → 購入 → ロック解除）
  const handleCoinPurchase = async () => {
    if (!user || !wallet) {
      base44.auth.redirectToLogin();
      return;
    }

    // コイン価格計算（1円 = 10コイン）
    const coinPrice = Math.ceil(video.price * 10);
    if (wallet.balance < coinPrice) {
      // 残高不足 → チャージ画面へ
      toast.error(`残高不足です（需要: ${coinPrice.toLocaleString()}コイン、保有: ${wallet.balance.toLocaleString()}コイン）`);
      // チャージ画面へナビゲート（フロントエンド側で実装）
      window.location.href = "/yell-coin-charge";
      return;
    }

    setCoinProcessing(true);
    try {
      // Purchase レコード作成（コイン決済）
      const purchase = await base44.entities.Purchase.create({
        item_type: "video",
        item_id: video.id,
        amount: coinPrice,
        buyer_email: user.email,
        status: "completed",
        payment_method: "coin",
      });

      // ウォレット残高を減算
      const newBalance = wallet.balance - coinPrice;
      await base44.entities.YellCoinWallet.update(wallet.id, {
        balance: newBalance,
        total_sent: (wallet.total_sent || 0) + coinPrice,
      });

      toast.success(`✅ ${coinPrice.toLocaleString()}コインで購入完了！`);
      onPurchased?.();
    } catch (err) {
      toast.error("コイン決済エラー: " + err.message);
    } finally {
      setCoinProcessing(false);
    }
  };

  // Stripe決済（カード直接購入）
  const handleStripePurchase = async () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }

    setProcessing(true);
    try {
      const res = await base44.functions.invoke("createCheckoutSession", {
        item_type: "video",
        item_id: video.id,
        amount: video.price,
        item_title: video.title,
      });

      if (res.data?.sessionUrl) {
        window.location.href = res.data.sessionUrl;
      } else {
        toast.error("決済セッションの作成に失敗しました");
        setProcessing(false);
      }
    } catch (err) {
      toast.error("決済処理エラー: " + err.message);
      setProcessing(false);
    }
  };

  // モーダル開閉時に body overflow を制御（ロック強化）
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

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
              ¥{video.price?.toLocaleString()}
            </p>
          </div>

          {/* Stripe手数料外出し表示（透明性） */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-2 text-xs">
            <p className="font-semibold text-blue-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              決済手数料（Stripe）
            </p>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>ビデオ購入価格</span>
                <span className="font-semibold text-foreground">¥{video.price?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>Stripe決済手数料 (3.6% + ¥40)</span>
                <span className="text-blue-400 font-semibold">¥{stripeFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-blue-500/20 pt-1 flex justify-between font-bold">
                <span>あなたがお支払い</span>
                <span className="text-blue-400">¥{totalCharge.toLocaleString()}</span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground/60 border-t border-blue-500/20 pt-1 leading-relaxed">
              ※ Stripe手数料はお客様ご負担です。ご請求額は合計金額となります。
            </p>
          </div>

          {/* 購入ボタン（2並列導線） */}
          {!user ? (
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              className="w-full h-12 bg-primary hover:bg-primary/90 font-bold gap-2"
            >
              <CreditCard className="w-4 h-4" />
              ログインして購入
            </Button>
          ) : (
            <div className="space-y-2">
              {/* エールコイン決済（推奨） */}
              <div className="relative">
                <Button
                  onClick={handleCoinPurchase}
                  disabled={coinProcessing || !wallet}
                  className="w-full h-14 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-black text-base gap-2 rounded-xl"
                >
                  {coinProcessing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                      処理中...
                    </>
                  ) : wallet && wallet.balance >= Math.ceil(video.price * 10) ? (
                    <>
                      <Check className="w-5 h-5" />
                      {Math.ceil(video.price * 10).toLocaleString()}コインで購入（最速）
                    </>
                  ) : (
                    <>
                      <Coins className="w-5 h-5" />
                      コインで購入
                    </>
                  )}
                </Button>
                {wallet && wallet.balance >= Math.ceil(video.price * 10) && (
                  <span className="absolute -top-2.5 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    推奨！最速
                  </span>
                )}
              </div>

              {/* Stripe直接購入 */}
              <div className="relative">
                <Button
                  onClick={handleStripePurchase}
                  disabled={processing}
                  variant="outline"
                  className="w-full h-12 font-bold gap-2 border-primary/40 hover:border-primary/60 rounded-xl"
                >
                  {processing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      カード支払い ¥{totalCharge.toLocaleString()}
                    </>
                  )}
                </Button>
                <span className="absolute -top-2.5 left-3 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                  クレジットカード
                </span>
              </div>

              {/* 残高不足の場合のメッセージ */}
              {wallet && wallet.balance < Math.ceil(video.price * 10) && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2.5 text-xs text-orange-300 text-center">
                  🪙 コイン残高: {wallet.balance.toLocaleString()} / 必要: {Math.ceil(video.price * 10).toLocaleString()}
                  <p className="text-[9px] mt-1 opacity-70">カード支払いをするか、コインをチャージしてください</p>
                </div>
              )}
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