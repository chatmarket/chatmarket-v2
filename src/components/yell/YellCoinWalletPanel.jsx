import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Plus, ArrowUpRight, ArrowDownLeft, Zap } from "lucide-react";
import { toast } from "sonner";

// チャージプラン
const CHARGE_PLANS = [
  { coins: 100, yen: 110, label: "100コイン" },
  { coins: 300, yen: 330, label: "300コイン" },
  { coins: 500, yen: 550, label: "500コイン", popular: true },
  { coins: 1000, yen: 1100, label: "1,000コイン" },
  { coins: 3000, yen: 3300, label: "3,000コイン" },
  { coins: 5000, yen: 5500, label: "5,000コイン" },
];

export default function YellCoinWalletPanel({ user }) {
  const [showCharge, setShowCharge] = useState(false);
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

  const chargeMutation = useMutation({
    mutationFn: async (plan) => {
      if (wallet) {
        await base44.entities.YellCoinWallet.update(wallet.id, {
          balance: balance + plan.coins,
          total_charged: (wallet.total_charged || 0) + plan.coins,
        });
      } else {
        await base44.entities.YellCoinWallet.create({
          user_email: user.email,
          balance: plan.coins,
          total_charged: plan.coins,
          total_sent: 0,
        });
      }
      await base44.entities.YellCoinTransaction.create({
        user_email: user.email,
        type: "charge",
        amount: plan.coins,
        yen_amount: plan.yen,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yell-wallet", user.email] });
      queryClient.invalidateQueries({ queryKey: ["yell-transactions", user.email] });
      setShowCharge(false);
      toast.success("チャージ完了！");
    },
  });

  const chargeTransactions = transactions.filter((t) => t.type === "charge");
  const sendTransactions = transactions.filter((t) => t.type === "send");

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
          </div>
          <Button
            onClick={() => setShowCharge(!showCharge)}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold gap-2"
          >
            <Plus className="w-4 h-4" /> チャージ
          </Button>
        </div>
      </div>

      {/* チャージプラン */}
      {showCharge && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-3">
          <p className="font-semibold text-sm flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-yellow-400" /> チャージプランを選択
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CHARGE_PLANS.map((plan) => (
              <button
                key={plan.coins}
                onClick={() => chargeMutation.mutate(plan)}
                disabled={chargeMutation.isPending}
                className="relative bg-secondary hover:bg-secondary/70 border border-border/50 hover:border-yellow-500/50 rounded-xl p-3 text-center transition-all group"
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] px-2">人気</Badge>
                )}
                <p className="font-bold text-yellow-400">{plan.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">¥{plan.yen.toLocaleString()}</p>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">※ 1コイン = 1.1円相当。購入後の返金はできません。</p>
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
                  tx.type === "charge" ? "bg-green-500/10" : "bg-yellow-500/10"
                }`}>
                  {tx.type === "charge"
                    ? <ArrowDownLeft className="w-4 h-4 text-green-400" />
                    : <ArrowUpRight className="w-4 h-4 text-yellow-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {tx.type === "charge" ? "チャージ" : `${tx.target_name || "送付"}へ`}
                  </p>
                  {tx.message && <p className="text-xs text-muted-foreground truncate">{tx.message}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_date).toLocaleDateString("ja-JP")}
                    {tx.yen_amount && ` • ¥${tx.yen_amount.toLocaleString()}`}
                  </p>
                </div>
                <p className={`font-bold text-sm shrink-0 ${tx.type === "charge" ? "text-green-400" : "text-yellow-400"}`}>
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