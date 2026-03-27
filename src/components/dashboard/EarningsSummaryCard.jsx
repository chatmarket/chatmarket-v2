import React from "react";
import { TrendingUp, Coins, PhoneCall, ShoppingBag } from "lucide-react";

export default function EarningsSummaryCard({
  totalRevenue,
  superChatRevenue,
  videoCallRevenue,
  purchaseRevenue,
  monthSuperChats,
  monthVideoCalls,
  monthPurchases,
}) {
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  const items = [
    { label: "エールコイン", icon: Coins, revenue: superChatRevenue, count: monthSuperChats, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "ビデオ通話", icon: PhoneCall, revenue: videoCallRevenue, count: monthVideoCalls, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "動画・配信販売", icon: ShoppingBag, revenue: purchaseRevenue, count: monthPurchases, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          {monthLabel}の売上
        </h2>
        <span className="text-xs text-muted-foreground">手数料控除後</span>
      </div>

      {/* 合計 */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl px-5 py-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">当月合計売上</p>
        <p className="text-4xl font-black text-primary">
          ¥{Math.floor(totalRevenue).toLocaleString()}
        </p>
      </div>

      {/* 内訳 */}
      <div className="grid grid-cols-3 gap-3">
        {items.map(({ label, icon: Icon, revenue, count, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-3 space-y-1.5`}>
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </div>
            <p className={`text-base font-black ${color}`}>¥{Math.floor(revenue).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">{count}件</p>
          </div>
        ))}
      </div>
    </div>
  );
}