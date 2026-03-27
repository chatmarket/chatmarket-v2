import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, TrendingUp, Coins } from "lucide-react";

export default function RevenueRankingWidget({ channelId, targetEmail }) {
  const [period, setPeriod] = useState("week");

  const { data: superChats = [] } = useQuery({
    queryKey: ["revenue-ranking", channelId, targetEmail],
    queryFn: async () => {
      if (targetEmail) {
        return base44.entities.SuperChat.filter({ callee_email: targetEmail }, "-created_date", 500);
      }
      return base44.entities.SuperChat.filter({ livestream_id: channelId }, "-created_date", 500);
    },
    enabled: !!channelId || !!targetEmail,
  });

  const rankingData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let filterDate;
    if (period === "week") {
      const dayOfWeek = startOfToday.getDay();
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      filterDate = startOfWeek;
    } else {
      filterDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filtered = superChats.filter((sc) => new Date(sc.created_date) >= filterDate);
    const grouped = {};

    filtered.forEach((sc) => {
      const key = sc.user_name || "匿名";
      if (!grouped[key]) {
        grouped[key] = { name: key, amount: 0, count: 0 };
      }
      grouped[key].amount += sc.amount || 0;
      grouped[key].count += 1;
    });

    return Object.values(grouped)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [superChats, period]);

  if (superChats.length === 0) return null;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-400" />
        <h3 className="font-bold">収益ランキング</h3>
      </div>

      <Tabs defaultValue="week" onValueChange={setPeriod} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-secondary h-auto p-1">
          <TabsTrigger value="week" className="text-sm">週間</TabsTrigger>
          <TabsTrigger value="month" className="text-sm">月間</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-2 mt-3">
          {rankingData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">ランキングデータなし</p>
          ) : (
            rankingData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2.5">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.count}回 送付</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-yellow-400 flex items-center gap-0.5">
                    <Coins className="w-3 h-3" />
                    {item.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}