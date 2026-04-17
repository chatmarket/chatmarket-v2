import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// 確定販売テーブル（docs/DEVELOPMENT_HISTORY.md Section 10 参照）
// ⚠️ ボーナス率を8%以上にするのは逆ざやリスクのため禁止
const COIN_PLANS = [
  {
    id: "plan_1000",
    base_price: 1000,
    charge_amount: 1038,
    coins: 1000,
    bonus_coins: 0,
    bonus_rate: 0,
    popular: false,
  },
  {
    id: "plan_5000",
    base_price: 5000,
    charge_amount: 5187,
    coins: 5000,
    bonus_coins: 400,
    bonus_rate: 8,
    popular: true,
  },
  {
    id: "plan_10000",
    base_price: 10000,
    charge_amount: 10374,
    coins: 10000,
    bonus_coins: 800,
    bonus_rate: 8,
    popular: false,
  },
];

export default function CoinPurchasePanel({ onSuccess }) {
  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    base44.entities.YellCoinWallet.filter({ user_email: user.email })
      .then((wallets) => setWallet(wallets[0] || null))
      .catch(() => {});
  }, [user]);

  // URL に session_id が付いて戻ってきた場合は成功通知
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("session_id") && params.get("plan")) {
      toast.success("コインを購入しました！反映まで少々お待ちください。");
      if (onSuccess) onSuccess();
      // クリーンなURLに戻す
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handlePurchase = async (plan) => {
    if (!user) { toast.error("ログインが必要です"); return; }
    setLoading(true);
    setSelectedPlan(plan.id);
    try {
      const successUrl = window.location.href.split("?")[0];
      const res = await base44.functions.invoke("createCoinCheckoutSession", {
        planId: plan.id,
        successUrl,
        cancelUrl: successUrl,
      });
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("決済ページの生成に失敗しました");
      }
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 残高 */}
      {wallet !== null && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <p className="text-xs text-yellow-300/70">現在の残高</p>
            <p className="font-black text-yellow-400 text-lg">{(wallet?.balance ?? 0).toLocaleString()} コイン</p>
          </div>
        </div>
      )}

      {/* 料金プラン */}
      <div className="grid gap-3">
        {COIN_PLANS.map((plan) => {
          const totalCoins = plan.coins + plan.bonus_coins;
          const isSelected = selectedPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative bg-card border-2 rounded-2xl p-4 transition-all cursor-pointer ${
                plan.popular
                  ? "border-primary/60 bg-primary/5"
                  : "border-border hover:border-border/80"
              }`}
              onClick={() => !loading && handlePurchase(plan)}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> おすすめ
                </span>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-foreground">
                      {totalCoins.toLocaleString()}コイン
                    </span>
                    {plan.bonus_coins > 0 && (
                      <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded-full">
                        +{plan.bonus_rate}%ボーナス
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                    <p>
                      購入: {plan.coins.toLocaleString()}コイン
                      {plan.bonus_coins > 0 && (
                        <span className="text-primary font-semibold"> + ボーナス{plan.bonus_coins}コイン</span>
                      )}
                    </p>
                    <p>お支払い: <span className="font-semibold text-foreground/80">¥{plan.charge_amount.toLocaleString()}</span>
                      <span className="text-muted-foreground/60"> (定価¥{plan.base_price.toLocaleString()} + 事務手数料3.6%)</span>
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={loading}
                  className={`shrink-0 gap-1.5 ${plan.popular ? "bg-primary hover:bg-primary/90" : "bg-secondary hover:bg-secondary/80 text-foreground"}`}
                  onClick={(e) => { e.stopPropagation(); handlePurchase(plan); }}
                >
                  {isSelected && loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Coins className="w-4 h-4" />
                  )}
                  購入する
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 環境免責 */}
      <div className="bg-secondary/80 border border-border rounded-xl p-3 text-xs text-muted-foreground space-y-1">
        <p>購入を行うことで、<a href="/terms" className="text-primary underline" target="_blank">利用規約</a>に同意したものとみなされます。通信環境やブラウザ設定に起因する接続不良については、利用規約に基づき補償の対象外となります。</p>
      </div>



      {/* 注意書き */}
      <div className="bg-secondary rounded-xl p-3 space-y-1 text-xs text-muted-foreground">
        <div className="flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
          <div className="space-y-1">
            <p>・表示の支払額には事務手数料（3.6%）が含まれます。</p>
            <p>・コインの有効期限は購入日から180日です。</p>
            <p>・ボーナスコインを含む払い出しには通常のライバー還元率（85〜95%）が適用されます。</p>
            <p>・購入後のキャンセル・返金はできません。</p>
          </div>
        </div>
      </div>
    </div>
  );
}