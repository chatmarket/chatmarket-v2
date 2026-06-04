import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Plus, ArrowUpRight, ArrowDownLeft, Zap, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
const TERMS_VERSION = "2026-06";

// 正式購入プラン（2026-06-04確定）: エールコイン購入手数料 5%（税込）
// viewer_total = coins + Math.ceil(coins * 0.05) / 付与コイン = coins のみ
const CHARGE_PLANS = [
  { coins: 1000 },
  { coins: 3000, popular: true },
  { coins: 5000 },
  { coins: 10000 },
].map(p => ({
  ...p,
  fee: Math.ceil(p.coins * 0.05),
  yen: p.coins + Math.ceil(p.coins * 0.05),
  label: `${p.coins.toLocaleString()}コイン`,
}));

export default function YellCoinWalletPanel({ user }) {
  const [showCharge, setShowCharge] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const queryClient = useQueryClient();

  const { data: wallets = [] } = useQuery({
    queryKey: ["yell-wallet", user?.email],
    queryFn: () => base44.entities.YellCoinWallet.filter({ user_email: user.email }),
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["yell-transactions", user?.email],
    queryFn: () => base44.entities.YellCoinTransaction.filter({ user_email: user.email }, "-created_date", 50),
    enabled: !!user,
  });

  const wallet = wallets[0];
  const balance = wallet?.balance || 0;
  const isFirstCharge = !wallet?.first_terms_agreed_at;

  // 直近で失効するコインの期限を計算
  const nextExpiry = useMemo(() => {
    const now = new Date();
    const active = transactions
      .filter(t => t.type === "charge" && !t.is_expired && t.expires_at && new Date(t.expires_at) > now)
      .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at));
    return active[0] || null;
  }, [transactions]);

  const chargeMutation = useMutation({
    mutationFn: async (plan) => {
      const agreedAt = new Date().toISOString();
      const walletUpdate = {
        balance: balance + plan.coins,
        total_charged: (wallet?.total_charged || 0) + plan.coins,
        last_terms_agreed_at: agreedAt,
        terms_version: TERMS_VERSION,
      };
      if (!wallet?.first_terms_agreed_at) {
        walletUpdate.first_terms_agreed_at = agreedAt;
      }
      if (wallet) {
        await base44.entities.YellCoinWallet.update(wallet.id, walletUpdate);
      } else {
        await base44.entities.YellCoinWallet.create({
          user_email: user.email,
          balance: plan.coins,
          total_charged: plan.coins,
          total_sent: 0,
          first_terms_agreed_at: agreedAt,
          last_terms_agreed_at: agreedAt,
          terms_version: TERMS_VERSION,
        });
      }
      // 有効期限 = チャージ日から180日（資金決済法：自家型前払式支払手段）
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 180);
      await base44.entities.YellCoinTransaction.create({
        user_email: user.email,
        type: "charge",
        service_type: "charge",
        amount: plan.coins,
        yen_amount: plan.yen,
        expires_at: expiresAt.toISOString(),
        is_expired: false,
        terms_agreed_at: agreedAt,
        terms_version: TERMS_VERSION,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yell-wallet", user.email] });
      queryClient.invalidateQueries({ queryKey: ["yell-transactions", user.email] });
      setShowCharge(false);
      toast.success("チャージ完了！");
    },
  });

  return (
    <div className="space-y-6">
      {/* 残高カード */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-400" /> エールコイン残高
            </p>
            <p className="text-4xl font-black text-yellow-400">{balance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">
              累計チャージ: {(wallet?.total_charged || 0).toLocaleString()} コイン ／ 累計送付: {(wallet?.total_sent || 0).toLocaleString()} コイン
            </p>
            {nextExpiry && (
              <p className="text-xs text-orange-400 flex items-center gap-1 mt-1.5">
                <Clock className="w-3 h-3" />
                直近の失効期限: {new Date(nextExpiry.expires_at).toLocaleDateString('ja-JP')}（{nextExpiry.amount.toLocaleString()}枚）
              </p>
            )}
          </div>
          <Button
            onClick={() => setShowCharge(!showCharge)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold gap-2"
          >
            <Plus className="w-4 h-4" /> チャージ
          </Button>
        </div>

        {/* 法的注意事項 */}
        <div className="mt-4 bg-black/30 border border-yellow-500/20 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-yellow-200/70 leading-relaxed">
            エールコインは<strong className="text-yellow-300">購入日から180日</strong>の有効期限があります。期限を過ぎたコインは自動的に失効します。
            <strong className="text-red-400"> 購入後の払い戻し（返金）は一切できません。</strong>
            エールコイン購入時には、エールコイン購入手数料5%（税込）が加算されます。
          </p>
        </div>
      </div>

      {/* チャージプラン */}
      {showCharge && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
          <p className="font-semibold text-sm flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-400" /> チャージプランを選択
          </p>
          {isFirstCharge && (
            <div className="bg-red-600/20 border-2 border-red-500/60 rounded-xl px-3 py-3 space-y-1">
              <p className="text-xs text-red-300 font-black flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> 「初回購入」必読事項 — 同意タイムスタンプを保存します
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                ・エールコインは<strong className="text-foreground">購入日から180日</strong>の有効期限です。期限後は自動失効します。<br />
                ・購入後の返金は<strong className="text-red-400">一切できません。</strong>（資金決済法第31条対応）<br />
                ・1コイン = 1円 / エールコイン購入時に購入手数料5%（税込）が加算されます。<br />
                ・同意時刻は当社サーバーに永久保存されます。
              </p>
            </div>
          )}
          {!isFirstCharge && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5 space-y-1">
              <p className="text-[11px] text-red-300 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> 重要事項
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                ・有効期限: 購入日から<strong className="text-foreground">180日</strong> ・返金不可 <strong className="text-red-400">一切不可</strong><br />
                ・初回同意日時: {new Date(wallet?.first_terms_agreed_at).toLocaleString("ja-JP")}
              </p>
            </div>
          )}

          {/* 同意チェックボックス */}
          <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-yellow-300">【重要：購入前にご確認ください】</p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 accent-yellow-400"
              />
              <span className="text-[11px] text-foreground/80 leading-relaxed">
                エールコインの有効期限は購入から<strong>180日間</strong>であり、購入後のキャンセル・払い戻しはできません。上記に同意して購入します。
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CHARGE_PLANS.map((plan) => (
              <button
                key={plan.coins}
                onClick={() => chargeMutation.mutate(plan)}
                disabled={chargeMutation.isPending || !agreedToTerms}
                className="relative bg-secondary hover:bg-secondary/70 border border-border/50 hover:border-yellow-500/50 rounded-xl p-3 text-center transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] px-2">人気</Badge>
                )}
                <p className="font-bold text-yellow-400">{plan.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">¥{plan.yen.toLocaleString()} <span className="text-yellow-500/60">（手数料5%込）</span></p>
              </button>
            ))}
          </div>
          {!agreedToTerms && (
            <p className="text-[11px] text-center text-muted-foreground">※ 上記の同意チェックを入れると購入できます</p>
          )}
        </div>
      )}

      {/* 履歴 */}
      <div className="space-y-3">
        <p className="font-semibold text-sm">取引履歴</p>

        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">取引履歴はありません</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  tx.type === "charge" ? "bg-green-500/10" : tx.type === "expire" ? "bg-red-500/10" : "bg-yellow-500/10"
                }`}>
                  {tx.type === "charge"
                    ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                    : tx.type === "expire"
                    ? <AlertTriangle className="w-4 h-4 text-red-400" />
                    : <ArrowUpRight className="w-4 h-4 text-yellow-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {tx.type === "charge" ? "チャージ" : tx.type === "expire" ? "失効（有効期限切れ）" : `${tx.target_name || "送付"}へ`}
                  </p>
                  {tx.message && <p className="text-xs text-muted-foreground truncate">{tx.message}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_date).toLocaleDateString("ja-JP")}
                    {tx.yen_amount ? ` • ¥${tx.yen_amount.toLocaleString()}` : ""}
                    {tx.type === "charge" && tx.expires_at && ` • 期限: ${new Date(tx.expires_at).toLocaleDateString("ja-JP")}`}
                  </p>
                </div>
                <p className={`font-bold text-sm shrink-0 ${tx.type === "charge" ? "text-green-400" : tx.type === "expire" ? "text-red-400" : "text-yellow-400"}`}>
                  {tx.type === "charge" ? "+" : "-"}{tx.amount.toLocaleString()} 枚
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}