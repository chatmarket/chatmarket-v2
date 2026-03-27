import React from "react";
import { Radio, PhoneCall, ShoppingBag, Clock } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const TYPE_CONFIG = {
  live: { icon: Radio, label: "ライブ配信", color: "text-red-400", bg: "bg-red-500/10" },
  call: { icon: PhoneCall, label: "ビデオ通話", color: "text-blue-400", bg: "bg-blue-500/10" },
  purchase: { icon: ShoppingBag, label: "動画購入", color: "text-primary", bg: "bg-primary/10" },
};

function getTitle(type, item) {
  if (type === "live") return item.title || "ライブ配信";
  if (type === "call") return `${item.caller_name || item.caller_email} との通話`;
  if (type === "purchase") return item.item_title || "動画購入";
  return "-";
}

function getAmount(type, item) {
  if (type === "live") return item.price > 0 ? `¥${item.price?.toLocaleString()}` : null;
  if (type === "call") return item.price > 0 ? `¥${Math.floor((item.price || 0) * 0.85).toLocaleString()}` : null;
  if (type === "purchase") return `¥${Math.floor((item.amount || 0) * 0.85).toLocaleString()}`;
  return null;
}

export default function RecentActivityList({ activities }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
      <h2 className="font-bold flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary" />
        直近のアクティビティ
      </h2>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">アクティビティはまだありません</p>
      ) : (
        <div className="divide-y divide-border/40">
          {activities.map((activity, idx) => {
            const config = TYPE_CONFIG[activity.type];
            const Icon = config.icon;
            const title = getTitle(activity.type, activity.item);
            const amount = getAmount(activity.type, activity.item);
            const dateStr = activity.date
              ? format(new Date(activity.date), "M/d HH:mm", { locale: ja })
              : "-";

            return (
              <div key={idx} className="flex items-center gap-3 py-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{title}</p>
                  <p className="text-[11px] text-muted-foreground">{config.label} · {dateStr}</p>
                </div>
                {amount && (
                  <span className={`text-sm font-bold shrink-0 ${config.color}`}>{amount}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}