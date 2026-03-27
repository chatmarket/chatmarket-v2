import React, { useMemo } from "react";
import { TrendingUp } from "lucide-react";

const ADMIN_EMAILS = ["unei@chatmarket.info", "ono@onestep-corp.com"];

// プログレッシブインセンティブの利率テーブル
const INCENTIVE_RATES = [
  { minRevenue: 0, maxRevenue: 1000000, rate: 85 },
  { minRevenue: 1000000, maxRevenue: 3000000, rate: 86 },
  { minRevenue: 3000000, maxRevenue: 6000000, rate: 87 },
  { minRevenue: 6000000, maxRevenue: 9000000, rate: 88 },
  { minRevenue: 9000000, maxRevenue: 12000000, rate: 89 },
  { minRevenue: 12000000, maxRevenue: 15000000, rate: 90 },
  { minRevenue: 15000000, maxRevenue: 16500000, rate: 91 },
  { minRevenue: 16500000, maxRevenue: 18000000, rate: 92 },
  { minRevenue: 18000000, maxRevenue: 19500000, rate: 93 },
  { minRevenue: 19500000, maxRevenue: 20000000, rate: 94 },
  { minRevenue: 20000000, maxRevenue: Infinity, rate: 95 },
];

function getIncentiveRate(revenue) {
  const tier = INCENTIVE_RATES.find((t) => revenue >= t.minRevenue && revenue < t.maxRevenue);
  return tier?.rate || 85;
}

export default function ProgressiveIncentiveList({
  users = [],
  subscriptions = [],
  purchases = [],
  calls = [],
  yellCoinTransactions = [],
  userRole = "user",
}) {
  const eligibleUsers = useMemo(() => {
    // BASICプラン加入者を取得
    const basicSubscribers = subscriptions
      .filter((s) => s.plan_id === "basic" && s.status === "active")
      .map((s) => s.user_email);

    // 管理者以外なら管理者メール除外
    const filteredSubscribers = userRole === "admin" 
      ? basicSubscribers 
      : basicSubscribers.filter((email) => !ADMIN_EMAILS.includes(email));

    // 各ユーザーの月間売上を計算
    const userRevenue = {};
    filteredSubscribers.forEach((email) => {
      userRevenue[email] = 0;
    });

    // 動画販売
    purchases
      .filter((p) => p.item_type === "video" && filteredSubscribers.includes(p.created_by))
      .forEach((p) => {
        userRevenue[p.created_by] = (userRevenue[p.created_by] || 0) + (p.amount || 0);
      });

    // ライブ配信
    purchases
      .filter((p) => p.item_type === "livestream" && filteredSubscribers.includes(p.created_by))
      .forEach((p) => {
        userRevenue[p.created_by] = (userRevenue[p.created_by] || 0) + (p.amount || 0);
      });

    // ビデオ通話
    calls
      .filter((c) => c.status === "ended" && (c.price || 0) > 0 && filteredSubscribers.includes(c.callee_email))
      .forEach((c) => {
        userRevenue[c.callee_email] = (userRevenue[c.callee_email] || 0) + (c.price || 0);
      });

    // エールコイン
    yellCoinTransactions
      .filter((t) => t.type === "charge" && filteredSubscribers.includes(t.user_email))
      .forEach((t) => {
        userRevenue[t.user_email] = (userRevenue[t.user_email] || 0) + (t.yen_amount || 0);
      });

    // ユーザー情報と売上を結合
    return filteredSubscribers
      .map((email) => {
        const user = users.find((u) => u.email === email);
        const revenue = userRevenue[email] || 0;
        return {
          email,
          fullName: user?.full_name || "未設定",
          revenue,
          rate: getIncentiveRate(revenue),
          nextTierRevenue: INCENTIVE_RATES.find((t) => revenue < t.minRevenue + 3000000)?.minRevenue || 0,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [users, subscriptions, purchases, calls, yellCoinTransactions, userRole]);

  if (eligibleUsers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">BASICプラン加入者がいません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">プログレッシブインセンティブ対象者</h3>
        <span className="text-xs bg-primary/20 text-primary rounded-full px-2 py-0.5">
          {eligibleUsers.length}名
        </span>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-200">
        <p className="font-semibold mb-1">プログレッシブインセンティブについて</p>
        <p className="text-xs">月間売上に応じて翌月の収益還元率が85%〜95%に上昇します。BASICプラン加入者が対象です。</p>
      </div>

      <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary">
              <th className="text-left py-3 px-3 font-bold">ユーザー</th>
              <th className="text-left py-3 px-3 font-bold">メール</th>
              <th className="text-right py-3 px-3 font-bold">月間売上</th>
              <th className="text-center py-3 px-3 font-bold">翌月還元率</th>
              <th className="text-right py-3 px-3 font-bold">次のティア</th>
            </tr>
          </thead>
          <tbody>
            {eligibleUsers.map((user, idx) => {
              const nextTierRevenueNeeded = user.nextTierRevenue - user.revenue;
              return (
                <tr key={idx} className="border-b border-border/30 hover:bg-secondary/50">
                  <td className="py-3 px-3 font-semibold">
                    <span className="text-xs">{user.fullName || "未設定"}</span>
                  </td>
                  <td className="py-3 px-3 text-xs font-mono text-muted-foreground">{user.email}</td>
                  <td className="py-3 px-3 text-right font-semibold text-primary">
                    ¥{user.revenue.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block font-bold px-2 py-1 rounded-full text-xs ${
                      user.rate >= 90 ? "bg-green-500/20 text-green-300" :
                      user.rate >= 88 ? "bg-blue-500/20 text-blue-300" :
                      "bg-gray-500/20 text-gray-300"
                    }`}>
                      {user.rate}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-xs text-muted-foreground">
                    {nextTierRevenueNeeded > 0 
                      ? `¥${nextTierRevenueNeeded.toLocaleString()} 必要`
                      : "最高ティア"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ティア別集計 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border/50 p-4 space-y-2">
          <p className="text-xs text-muted-foreground">85% 〜 87% のユーザー</p>
          <p className="text-2xl font-bold">{eligibleUsers.filter((u) => u.rate <= 87).length}名</p>
        </div>
        <div className="bg-card rounded-lg border border-border/50 p-4 space-y-2">
          <p className="text-xs text-muted-foreground">88% 〜 89% のユーザー</p>
          <p className="text-2xl font-bold">{eligibleUsers.filter((u) => u.rate >= 88 && u.rate <= 89).length}名</p>
        </div>
        <div className="bg-card rounded-lg border border-border/50 p-4 space-y-2">
          <p className="text-xs text-muted-foreground">90% 以上のユーザー</p>
          <p className="text-2xl font-bold">{eligibleUsers.filter((u) => u.rate >= 90).length}名</p>
        </div>
      </div>
    </div>
  );
}