/**
 * LivePaywall — 有料配信の視聴前「門番」コンポーネント
 * 
 * ロジック:
 *  1. price=0 → 即座に onAllowed() を呼んで通過
 *  2. 未ログイン → ログイン誘導
 *  3. コイン残高 >= price → 「消費して視聴」確認 → onAllowed()
 *  4. コイン不足 → Stripe コイン購入ページへ（successUrl = 現在の配信URL）
 */
import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Coins, Loader2, Lock, Zap, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const COIN_PLANS = [
  { id: "plan_1000",  coins: 1000,  charge_amount: 1038 },
  { id: "plan_5000",  coins: 5400,  charge_amount: 5187 },
  { id: "plan_10000", coins: 10800, charge_amount: 10374 },
];

export default function LivePaywall({ stream, user, onAllowed }) {
  const [wallet, setWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [consuming, setConsuming] = useState(false);
  const [buyingPlanId, setBuyingPlanId] = useState(null);

  const price = stream?.price ?? 0;

  // 無料配信は即通過
  useEffect(() => {
    if (price <= 0) { onAllowed(); }
  }, [price]);

  // ウォレット取得
  useEffect(() => {
    if (!user || price <= 0) return;
    base44.entities.YellCoinWallet.filter({ user_email: user.email })
      .then((w) => setWallet(w[0] || { balance: 0 }))
      .catch(() => setWallet({ balance: 0 }))
      .finally(() => setLoadingWallet(false));
  }, [user?.email, price]);

  // Stripe決済戻り検知 → 残高リロード → 再チェック
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("coin_purchase") === "success") {
      toast.success("コインを購入しました！");
      window.history.replaceState({}, "", window.location.pathname);
      // ウォレット再取得
      if (user) {
        base44.entities.YellCoinWallet.filter({ user_email: user.email })
          .then((w) => setWallet(w[0] || { balance: 0 }))
          .catch(() => {});
      }
    }
  }, []);

  // コイン消費して視聴開始
  const handleConsume = async () => {
    if (!wallet || wallet.balance < price) return;
    setConsuming(true);
    try {
      const newBalance = wallet.balance - price;
      await base44.entities.YellCoinWallet.update(wallet.id, { balance: newBalance });
      await base44.entities.YellCoinTransaction.create({
        user_email: user.email,
        type: "send",
        amount: price,
        target_name: stream.channel_name || "",
        target_id: stream.id,
        service_type: "superchat",
        service_id: stream.id,
        channel_id: stream.channel_id,
        channel_owner_email: stream.channel_owner_email || "",
      });
      toast.success("視聴開始！");
      onAllowed();
    } catch (e) {
      toast.error("エラーが発生しました: " + e.message);
    } finally {
      setConsuming(false);
    }
  };

  // Stripe コイン購入（successUrl = 現在の配信URL + coin_purchase=success）
  const handleBuyCoin = async (planId) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    setBuyingPlanId(planId);
    try {
      const currentUrl = window.location.href.split("?")[0];
      const successUrl = `${currentUrl}?coin_purchase=success`;
      const res = await base44.functions.invoke("createCoinCheckoutSession", {
        planId,
        successUrl,
        cancelUrl: currentUrl,
      });
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("決済ページの生成に失敗しました");
      }
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setBuyingPlanId(null);
    }
  };

  // 無料配信はこのコンポーネント自体を表示しない
  if (price <= 0) return null;

  // 未ログイン
  if (!user) {
    return (
      <PaywallShell stream={stream} price={price}>
        <p className="text-sm text-zinc-400 text-center">視聴にはログインが必要です</p>
        <Button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="w-full gap-2">
          <Lock className="w-4 h-4" /> ログインして視聴する
        </Button>
      </PaywallShell>
    );
  }

  // ウォレット読み込み中
  if (loadingWallet) {
    return (
      <PaywallShell stream={stream} price={price}>
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </PaywallShell>
    );
  }

  const balance = wallet?.balance ?? 0;
  const canAfford = balance >= price;

  return (
    <PaywallShell stream={stream} price={price}>
      {/* 残高表示 */}
      <div className={`flex items-center gap-2 rounded-xl px-4 py-3 border ${
        canAfford
          ? "bg-yellow-500/10 border-yellow-500/30"
          : "bg-red-500/10 border-red-500/30"
      }`}>
        <Coins className={`w-5 h-5 shrink-0 ${canAfford ? "text-yellow-400" : "text-red-400"}`} />
        <div>
          <p className="text-xs text-zinc-400">あなたの残高</p>
          <p className={`font-black text-lg ${canAfford ? "text-yellow-400" : "text-red-400"}`}>
            {balance.toLocaleString()} コイン
          </p>
        </div>
        {!canAfford && (
          <p className="ml-auto text-xs text-red-400 font-bold">
            {(price - balance).toLocaleString()} コイン不足
          </p>
        )}
      </div>

      {canAfford ? (
        /* 残高足りる → 消費して視聴 */
        <Button
          onClick={handleConsume}
          disabled={consuming}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-black font-black text-base gap-2"
        >
          {consuming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
          {price.toLocaleString()} コイン消費して視聴する
        </Button>
      ) : (
        /* コイン不足 → Stripe購入ボタン一覧 */
        <div className="space-y-2">
          <p className="text-xs text-zinc-400 text-center font-semibold">コインをチャージして視聴する</p>
          {COIN_PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handleBuyCoin(plan.id)}
              disabled={!!buyingPlanId}
              className="w-full flex items-center justify-between gap-3 bg-card border border-border hover:border-primary/50 rounded-xl px-4 py-3 transition-all disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="font-black text-sm">{plan.coins.toLocaleString()} コイン</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">¥{plan.charge_amount.toLocaleString()}</span>
                {buyingPlanId === plan.id
                  ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  : <ShoppingCart className="w-4 h-4 text-primary" />
                }
              </div>
            </button>
          ))}
          <p className="text-[10px] text-zinc-500 text-center">
            購入完了後、この配信ページに自動で戻ります
          </p>
        </div>
      )}
    </PaywallShell>
  );
}

/** 共通シェル: ビデオプレイヤー上のみに限定（z-index: 30はビデオコンテナ内の絶対位置） */
function PaywallShell({ stream, price, children }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-4 shadow-2xl">
        {/* ヘッダー */}
        <div className="text-center space-y-1">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="font-black text-white text-lg">有料配信</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            「{stream?.title || "この配信"}」の視聴には<br />
            <span className="text-yellow-400 font-black text-xl">{price.toLocaleString()} コイン</span>
            {" "}が必要です
          </p>
        </div>
        <div className="border-t border-zinc-700" />
        {children}
      </div>
    </div>
  );
}