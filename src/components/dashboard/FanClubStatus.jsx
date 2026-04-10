import React from "react";
import { Crown, Users, TrendingUp, TrendingDown } from "lucide-react";

export default function FanClubStatus({ followers = [], subscriptions = [] }) {
  const fanClubMembers = subscriptions.filter((s) => s.status === "active").length;
  const totalFollowers = followers.length;
  const monthlyRevenue = fanClubMembers * 3300;

  const stats = [
    { label: "ファンクラブ会員", value: fanClubMembers, unit: "人", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    { label: "総フォロワー数", value: totalFollowers, unit: "人", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "月額収益（会員費）", value: `¥${monthlyRevenue.toLocaleString()}`, unit: "", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-yellow-400" />
        <h3 className="font-bold text-sm">ファンクラブ状況</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s, i) => (
          <div key={i} className={`border rounded-xl p-3 text-center ${s.bg}`}>
            <p className={`text-xl font-black ${s.color}`}>{s.value}{s.unit && <span className="text-xs ml-0.5">{s.unit}</span>}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>
      {fanClubMembers === 0 && (
        <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
          ファンクラブ機能を有効にすると会員管理ができます
        </p>
      )}
    </div>
  );
}