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
  const [recentPurchase, setRecentPurchase] = useState(null); // 15分以内の支払い履歴

  const price = stream?.price ?? 0;

  // 15分以内の支払い履歴を検出
  useEffect(() => {
    if (!user || !stream?.id || price <= 0) return;
    
    base44.entities.Purchase.filter({ 
      item_type: "livestream", 
      item_id: stream.id, 
      buyer_email: user.email 
    }).then((purchases) => {
      if (purchases.length === 0) return;
      
      const latest = purchases[0]; // 最新の購入
      const purchasedAt = new Date(latest.created_date).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - purchasedAt) / 1000 / 60;
      
      console.log(`[LivePaywall] 支払い履歴チェック:`, { 
        経過分: diffMinutes.toFixed(1), 
        再入場無料: diffMinutes < 15 
      });
      
      // 15分以内なら再入場無料
      if (diffMinutes < 15) {
        setRecentPurchase({ ...latest, remainingMinutes: Math.ceil(15 - diffMinutes) });
      }
    }).catch(() => {});
  }, [user?.email, stream?.id, price]);

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

  // 15分以内の再入場無料を検出
  if (recentPurchase && recentPurchase.remainingMinutes > 0) {
    return (
      <PaywallShell stream={stream} price={price}>
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-black text-green-400">再入場無料</p>
              <p className="text-xs text-green-300/80">支払いから {recentPurchase.remainingMinutes} 分以内です</p>
            </div>
          </div>
          <Button
            onClick={() => { onAllowed(); }}
            className="w-full h-11 sm:h-12 bg-green-600 hover:bg-green-700 text-white font-black text-sm sm:text-base gap-2"
          >
            <span>▶️</span> 視聴を再開する
          </Button>
          <p className="text-[10px] text-green-300/60 text-center">追加課金なし・コイン消費なし</p>
        </div>
      </PaywallShell>
    );
  }

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
      {/* 残高表示（コンパクト） */}
      <div className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 border text-xs ${
        canAfford
          ? "bg-yellow-500/10 border-yellow-500/30"
          : "bg-red-500/10 border-red-500/30"
      }`}>
        <div className="flex items-center gap-1.5">
          <Coins className={`w-3.5 h-3.5 shrink-0 ${canAfford ? "text-yellow-400" : "text-red-400"}`} />
          <span className={`font-black text-xs ${canAfford ? "text-yellow-400" : "text-red-400"}`}>
            {balance.toLocaleString()}
          </span>
        </div>
        {!canAfford && (
          <span className="text-[10px] text-red-400 font-bold">
            {(price - balance).toLocaleString()} 不足
          </span>
        )}
      </div>

      {canAfford ? (
        /* 残高足りる → 消費して視聴 */
        <Button
          onClick={handleConsume}
          disabled={consuming}
          className="w-full h-9 bg-primary hover:bg-primary/90 text-black font-black text-xs gap-1"
        >
          {consuming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          <span className="truncate">{price}コイン消費</span>
        </Button>
      ) : (
        /* コイン不足 → Stripe購入（最小化） */
        <div className="space-y-1">
          <p className="text-[9px] text-zinc-400 text-center font-semibold">チャージして視聴</p>
          <div className="grid grid-cols-2 gap-1">
            {COIN_PLANS.slice(0, 2).map((plan) => {
              const stripeLink = getStripeLink(plan.stripeKey);
              const isLoading = bypassingLink === plan.stripeKey;
              return (
                <button
                  key={plan.id}
                  onClick={() => {
                    if (stripeLink) {
                      handleStripeDirect(plan.stripeKey);
                    } else {
                      toast.error(`${plan.coins}コイン購入がセットアップされていません`);
                    }
                  }}
                  disabled={!stripeLink || isLoading}
                  className={`flex flex-col items-center justify-center gap-0.5 bg-card border border-border hover:border-primary/50 rounded px-2 py-1.5 transition-all text-[10px] ${
                    !stripeLink || isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <span className="font-black text-xs">{plan.coins}</span>
                  <span className="text-zinc-400">¥{plan.charge_amount}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </PaywallShell>
  );
}

/** 共通シェル: 映像の上に重なるモーダル風レイアウト */
function PaywallShell({ stream, price, children }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6">
      <div className="w-full max-w-xs bg-zinc-900 border border-zinc-700 rounded-2xl p-4 sm:p-5 space-y-2.5 sm:space-y-3 shadow-2xl">
        {/* ヘッダー */}
        <div className="text-center space-y-0.5 mb-1.5">
          <div className="text-3xl">🔒</div>
          <h2 className="font-black text-white text-base">有料配信</h2>
          <p className="text-xs text-zinc-400 leading-tight">
            視聴には
            <span className="text-yellow-400 font-black text-sm block">{price.toLocaleString()} コイン</span>
            が必要です
          </p>
        </div>
        <div className="border-t border-zinc-700/50" />
        {children}
      </div>
    </div>
  );
}