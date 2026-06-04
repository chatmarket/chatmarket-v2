import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
// エールコイン購入プラン（2026-06-04確定）
// エールコイン購入手数料 5%（税込）= Math.ceil(coins × 0.05)
// viewer_total_yen = coins + fee  /  granted_coins = coins（手数料分は付与しない）
const COIN_FEE_RATE = 0.05;
const makePlan = (id, coins, popular = false) => ({
  id,
  coins,
  fee: Math.ceil(coins * COIN_FEE_RATE),
  total: coins + Math.ceil(coins * COIN_FEE_RATE),
  popular,
});

const COIN_PLANS = [
  makePlan("plan_1000",  1000),
  makePlan("plan_3000",  3000, true),
  makePlan("plan_5000",  5000),
  makePlan("plan_10000", 10000),
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
                  <span className="text-xl font-black text-foreground">
                    {plan.coins.toLocaleString()}コイン
                  </span>
                  <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    <div className="flex justify-between"><span>コイン本体価格</span><span>¥{plan.coins.toLocaleString()}</span></div>
                    <div className="flex justify-between text-yellow-400/80"><span>エールコイン購入手数料 5%（税込）</span><span>¥{plan.fee.toLocaleString()}</span></div>
                    <div className="flex justify-between font-semibold text-foreground/90 border-t border-border/40 pt-0.5 mt-0.5"><span>お支払総額</span><span>¥{plan.total.toLocaleString()}</span></div>
                    <div className="flex justify-between text-primary"><span>付与されるコイン数</span><span>{plan.coins.toLocaleString()}コイン</span></div>
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
            <p>・エールコイン購入時には、エールコイン購入手数料5%（税込）が加算されます。</p>
            <p>・コインの有効期限は購入日から180日です。</p>
            <p>・購入後のキャンセル・返金はできません。</p>
          </div>
        </div>
      </div>
    </div>
  );
}