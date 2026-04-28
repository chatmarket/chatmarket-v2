/**
 * LiveTicketPurchase
 * 1対多数ライブ配信のシンプルなチケット販売
 * - コイン課金（YellCoinWallet）
 * - クレジット課金（Stripe）
 * - 最低150円・15分単位・最大120分
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Coins, CreditCard, Lock } from "lucide-react";
import { toast } from "sonner";

const TICKET_PRESETS = [
  { minutes: 15, priceYen: 150 },
  { minutes: 30, priceYen: 300 },
  { minutes: 45, priceYen: 450 },
  { minutes: 60, priceYen: 600 },
  { minutes: 75, priceYen: 750 },
  { minutes: 90, priceYen: 900 },
  { minutes: 105, priceYen: 1050 },
  { minutes: 120, priceYen: 1200 },
];

export default function LiveTicketPurchase({ stream, user, onPurchaseSuccess, isOpen, onClose }) {
  const [selectedDuration, setSelectedDuration] = useState(stream?.ticket_duration_minutes || 15);
  const [paymentMethod, setPaymentMethod] = useState("coins");
  const [purchasing, setPurchasing] = useState(false);
  const [coinBalance, setCoinBalance] = useState(null);

  // コイン残高取得
  useEffect(() => {
    if (!user?.email || paymentMethod !== "coins" || !isOpen) return;
    base44.entities.YellCoinWallet.filter({ user_email: user.email }).then((wallets) => {
      setCoinBalance(wallets[0]?.balance || 0);
    });
  }, [user?.email, paymentMethod, isOpen]);

  if (!stream?.is_ticket_enabled || !user) return null;

  const preset = TICKET_PRESETS.find((p) => p.minutes === selectedDuration);
  const priceYen = preset?.priceYen || stream.ticket_price_yen || 150;
  const coinsNeeded = Math.ceil(priceYen / 1); // 1円 = 1コイン（簡易換算）

  const handleCoinPurchase = async () => {
    if (!user) {
      toast.error("ログインしてください");
      return;
    }

    if (coinBalance < coinsNeeded) {
      toast.error(`コイン不足。${coinsNeeded - coinBalance}コイン追加が必要です`);
      return;
    }

    setPurchasing(true);

    try {
      // 1. コイン減算
      const wallet = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
      if (wallet[0]) {
        await base44.entities.YellCoinWallet.update(wallet[0].id, {
          balance: wallet[0].balance - coinsNeeded,
          total_sent: (wallet[0].total_sent || 0) + coinsNeeded,
        });
      }

      // 2. チケット購入履歴記録
      const currentStream = await base44.entities.LiveStream.filter({ id: stream.id });
      const updatedPurchases = [...(currentStream[0]?.ticket_purchases || [])];
      updatedPurchases.push({
        user_email: user.email,
        user_name: user.full_name || user.email,
        price_yen: priceYen,
        payment_method: "coins",
        coins_used: coinsNeeded,
        purchased_at: new Date().toISOString(),
      });

      await base44.entities.LiveStream.update(stream.id, {
        ticket_purchases: updatedPurchases,
        ticket_total_revenue_yen: (currentStream[0]?.ticket_total_revenue_yen || 0) + priceYen,
      });

      toast.success(`${selectedDuration}分チケットを購入しました（${priceYen}円）`);
      onPurchaseSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error("購入処理に失敗しました: " + err.message);
    } finally {
      setPurchasing(false);
    }
  };

  const handleCreditCardPurchase = async () => {
    if (!user) {
      toast.error("ログインしてください");
      return;
    }

    setPurchasing(true);

    try {
      // Stripe チェックアウトセッション作成
      const res = await base44.functions.invoke("createLiveTicketCheckout", {
        stream_id: stream.id,
        user_email: user.email,
        price_yen: priceYen,
        duration_minutes: selectedDuration,
      });

      if (res.data?.session_url) {
        window.location.href = res.data.session_url;
      }
    } catch (err) {
      toast.error("決済処理に失敗しました: " + err.message);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            チケット購入
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 配信情報 */}
          <div className="rounded-xl bg-secondary/50 p-3">
            <p className="text-sm font-bold">{stream.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{stream.channel_name}</p>
          </div>

          {/* 時間選択 */}
          <div className="space-y-2">
            <label className="text-sm font-bold">視聴時間を選択</label>
            <div className="grid grid-cols-4 gap-2">
              {TICKET_PRESETS.map((p) => (
                <button
                  key={p.minutes}
                  onClick={() => setSelectedDuration(p.minutes)}
                  className={`rounded-lg px-2 py-2 text-xs font-bold transition-all ${
                    selectedDuration === p.minutes
                      ? "bg-primary text-black"
                      : "bg-secondary hover:border-primary border border-transparent"
                  }`}
                >
                  {p.minutes}分
                </button>
              ))}
            </div>
            <p className="text-xs text-primary font-bold mt-2">¥{priceYen.toLocaleString()}</p>
          </div>

          {/* 支払い方法選択 */}
          <div className="space-y-2">
            <label className="text-sm font-bold">支払い方法</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod("coins")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  paymentMethod === "coins"
                    ? "bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400"
                    : "bg-secondary border-2 border-transparent hover:border-yellow-500/50"
                }`}
              >
                <Coins className="w-4 h-4" />
                コイン
              </button>
              <button
                onClick={() => setPaymentMethod("credit_card")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  paymentMethod === "credit_card"
                    ? "bg-blue-500/20 border-2 border-blue-500 text-blue-400"
                    : "bg-secondary border-2 border-transparent hover:border-blue-500/50"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                カード
              </button>
            </div>
          </div>

          {/* コイン残高表示 */}
          {paymentMethod === "coins" && (
            <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3">
              <p className="text-xs text-yellow-300">
                残高: <span className="font-bold">{coinBalance}</span> コイン
                {coinBalance !== null && coinBalance < coinsNeeded && (
                  <span className="block text-red-400 mt-1">
                    ⚠️ {coinsNeeded - coinBalance} コイン不足
                  </span>
                )}
              </p>
            </div>
          )}

          {/* 購入ボタン */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border/50 text-sm font-bold hover:bg-secondary transition-all"
            >
              キャンセル
            </button>
            {paymentMethod === "coins" ? (
              <Button
                onClick={handleCoinPurchase}
                disabled={purchasing || !coinBalance || coinBalance < coinsNeeded}
                className="flex-1 gap-1.5 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50"
              >
                <Coins className="w-4 h-4" />
                {coinsNeeded}コインで購入
              </Button>
            ) : (
              <Button
                onClick={handleCreditCardPurchase}
                disabled={purchasing}
                className="flex-1 gap-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                ¥{priceYen}で購入
              </Button>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            購入後すぐに視聴可能になります
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}