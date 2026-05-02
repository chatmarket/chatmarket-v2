/**
 * LivePaywallStripe — Stripe決済リンク統合版
 * 
 * 社長からStripeリンクが届いたら lib/stripeLinks.js に流し込むだけで
 * 即座に全決済ボタンが自動対応する設計
 */

import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Coins, Loader2, Lock, Zap, ShoppingCart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getStripeLink, hasStripeLink } from "@/lib/stripeLinks";

const COIN_PLANS = [
  { id: "coin_1000",  coins: 1000,  charge_amount: 1038, stripeKey: "coin_1000" },
  { id: "coin_5000",  coins: 5400,  charge_amount: 5187, stripeKey: "coin_5000" },
  { id: "coin_10000", coins: 10800, charge_amount: 10374, stripeKey: "coin_10000" },
];

export default function LivePaywallStripe({ stream, user, onAllowed }) {
  const [wallet, setWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [consuming, setConsuming] = useState(false);
  const [bypassingLink, setBypassingLink] = useState(null); // Stripe直リン先中のプランキー

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

  // Stripe決済戻り検知 → 残高リロード
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_success") === "true") {
      toast.success("コインを購入しました！");
      window.history.replaceState({}, "", window.location.pathname);
      if (user) {
        base44.entities.YellCoinWallet.filter({ user_email: user.email })
          .then((w) => setWallet(w[0] || { balance: 0 }))
          .catch(() => {});
      }
    }
  }, []);

  // コイン消費して視聴開始（アトミック処理）
  const handleConsume = async () => {
    if (!wallet || wallet.balance < price) return;
    setConsuming(true);
    try {
      const res = await base44.functions.invoke("consumeCoinsForViewing", {
        stream_id: stream.id,
        price,
        channel_id: stream.channel_id,
        channel_owner_email: stream.channel_owner_email || "",
        channel_name: stream.channel_name || "",
      });
      if (res.data?.success) {
        setWallet((prev) => ({ ...prev, balance: res.data.new_balance }));
        toast.success("視聴開始！");
        onAllowed();
      } else {
        toast.error(res.data?.error || "視聴できませんでした");
      }
    } catch (e) {
      const msg = e.message || "決済に失敗しました";
      toast.error(msg.includes("402") || msg.includes("不足") 
        ? "コインが足りません。チャージしてください"
        : "決済に失敗しました。電波の良い場所で再度お試しください");
    } finally {
      setConsuming(false);
    }
  };

  // ★ Stripe決済リンク直接遷移（社長から渡されたリンクを即座に利用）
  const handleStripeDirect = (stripeKey) => {
    const link = getStripeLink(stripeKey);
    if (!link) {
      toast.error(`${stripeKey} のStripeリンクがまだ設定されていません`);
      return;
    }
    setBypassingLink(stripeKey);
    // successUrl付きでリダイレクト
    const redirectUrl = `${window.location.href}${window.location.href.includes('?') ? '&' : '?'}stripe_success=true`;
    window.location.href = `${link}?client_reference_id=${user?.email || 'guest'}&success_url=${encodeURIComponent(redirectUrl)}`;
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
          {COIN_PLANS.map((plan) => {
            const stripeLink = getStripeLink(plan.stripeKey);
            const isLoading = bypassingLink === plan.stripeKey;
            return (
              <button
                key={plan.id}
                onClick={() => {
                  if (stripeLink) {
                    handleStripeDirect(plan.stripeKey);
                  } else {
                    toast.error(`${plan.coins.toLocaleString()}コイン購入がまだセットアップされていません`);
                  }
                }}
                disabled={!stripeLink || isLoading}
                className={`w-full flex items-center justify-between gap-3 bg-card border border-border hover:border-primary/50 rounded-xl px-4 py-3 transition-all ${
                  !stripeLink || isLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="font-black text-sm">{plan.coins.toLocaleString()} コイン</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400">¥{plan.charge_amount.toLocaleString()}</span>
                  {isLoading
                    ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    : stripeLink
                    ? <ExternalLink className="w-4 h-4 text-primary" />
                    : <span className="text-xs text-red-400 font-bold">未設定</span>
                  }
                </div>
              </button>
            );
          })}
          <p className="text-[10px] text-zinc-500 text-center">
            購入完了後、この配信ページに自動で戻ります
          </p>
        </div>
      )}
    </PaywallShell>
  );
}

/** 共通シェル: 映像の上に重なるモーダル風レイアウト */
function PaywallShell({ stream, price, children }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4">
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