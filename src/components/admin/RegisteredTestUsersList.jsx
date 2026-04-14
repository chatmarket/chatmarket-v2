import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Coins, Badge } from "lucide-react";

export default function RegisteredTestUsersList() {
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["test-users-subscriptions"],
    queryFn: () => base44.entities.PlanSubscription.filter({ plan_id: "call-anser" }),
    refetchInterval: 30000,
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ["test-users-wallets"],
    queryFn: () => base44.entities.YellCoinWallet.list(),
    refetchInterval: 30000,
  });

  const testUsers = subscriptions.map((sub) => {
    const wallet = wallets.find((w) => w.user_email === sub.user_email);
    return {
      email: sub.user_email,
      plan: sub.plan_id,
      coins: wallet?.balance || 0,
      createdAt: new Date(sub.created_date).toLocaleString("ja-JP"),
    };
  });

  return (
    <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-green-400" />
        <h3 className="font-bold text-lg">登録済みテストユーザー</h3>
        <span className="text-xs font-black bg-green-500/20 text-green-400 border border-green-500/40 px-2 py-1 rounded-full">
          {testUsers.length}件
        </span>
      </div>

      {testUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">登録済みテストユーザーはありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-3 font-bold">メールアドレス</th>
                <th className="text-left py-3 px-3 font-bold">プラン</th>
                <th className="text-right py-3 px-3 font-bold">コイン残高</th>
                <th className="text-left py-3 px-3 font-bold">登録日時</th>
              </tr>
            </thead>
            <tbody>
              {testUsers.map((user) => (
                <tr key={user.email} className="border-b border-border/30 hover:bg-secondary/50">
                  <td className="py-3 px-3 font-mono text-xs text-primary">{user.email}</td>
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      <Badge className="w-3 h-3" /> {user.plan}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-yellow-400 flex items-center justify-end gap-1">
                    <Coins className="w-4 h-4" /> {user.coins}
                  </td>
                  <td className="py-3 px-3 text-muted-foreground text-xs">{user.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}