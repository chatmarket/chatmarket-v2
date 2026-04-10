import React from "react";
import { Bell, ShoppingBag, Phone, Radio, Heart, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

const TYPE_CONFIG = {
  purchase: { icon: ShoppingBag, color: "text-green-400", bg: "bg-green-500/10", label: "購入" },
  call: { icon: Phone, color: "text-blue-400", bg: "bg-blue-500/10", label: "通話" },
  live: { icon: Radio, color: "text-red-400", bg: "bg-red-500/10", label: "配信" },
  follow: { icon: Heart, color: "text-pink-400", bg: "bg-pink-500/10", label: "フォロー" },
  chat: { icon: MessageCircle, color: "text-primary", bg: "bg-primary/10", label: "メッセージ" },
};

function getActivityLabel(activity) {
  switch (activity.type) {
    case "purchase": return `¥${(activity.item?.amount || 0).toLocaleString()} の購入がありました`;
    case "call": return `ビデオ通話が完了しました（¥${(activity.item?.price || 0).toLocaleString()}）`;
    case "live": return `"${activity.item?.title || "配信"}" が終了しました`;
    default: return "新しい通知があります";
  }
}

export default function NotificationSidebar({ activities = [], notifications = [] }) {
  const items = activities.slice(0, 12);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">最新の通知</h3>
        </div>
        {items.length > 0 && (
          <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">
            {items.length}件
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">通知はありません</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {items.map((activity, idx) => {
            const cfg = TYPE_CONFIG[activity.type] || TYPE_CONFIG.chat;
            const Icon = cfg.icon;
            return (
              <div key={idx} className="flex items-start gap-2.5 bg-card border border-border/40 rounded-xl p-3 hover:border-border/70 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug line-clamp-2">{getActivityLabel(activity)}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {activity.date
                      ? formatDistanceToNow(new Date(activity.date), { addSuffix: true, locale: ja })
                      : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}