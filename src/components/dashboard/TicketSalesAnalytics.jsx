import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";
import { Ticket, TrendingUp, Users, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const COLORS = {
  sold: "#10b981",
  remaining: "#334155",
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }}>
          {p.name}: {p.value}枚
        </p>
      ))}
    </div>
  );
};

export default function TicketSalesAnalytics({ channelId }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["ticket-analytics", channelId],
    queryFn: () =>
      base44.entities.TicketEvent.filter(
        { channel_id: channelId, status: "on_sale" },
        "event_date"
      ),
    enabled: !!channelId,
  });

  if (isLoading) return (
    <div className="h-32 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
      読み込み中...
    </div>
  );

  if (events.length === 0) return (
    <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
      <Ticket className="w-8 h-8 opacity-30" />
      販売中のイベントはありません
    </div>
  );

  return (
    <div className="space-y-6">
      {events.map((event) => {
        const tiers = event.ticket_types || [];
        const totalCapacity = tiers.reduce((s, t) => s + (t.capacity || 0), 0);
        const totalSold = tiers.reduce((s, t) => s + (t.sold || 0), 0);
        const totalRevenue = tiers.reduce((s, t) => s + (t.sold || 0) * (t.price || 0), 0);
        const soldPct = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

        const chartData = tiers.map((t) => ({
          name: t.name,
          販売済み: t.sold || 0,
          残り枠: (t.capacity || 0) - (t.sold || 0),
        }));

        const saleTypeLabel = {
          public: { label: "一般販売", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
          fanclub: { label: "会員限定", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
          ppv: { label: "PPV事前", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
        }[event.sale_type] || { label: event.sale_type, color: "text-muted-foreground bg-secondary border-border" };

        return (
          <div key={event.id} className="bg-secondary/30 border border-border/50 rounded-2xl p-4 space-y-4">
            {/* Event header */}
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-[11px] font-bold border px-2 py-0.5 rounded-full ${saleTypeLabel.color}`}>
                    {saleTypeLabel.label}
                  </span>
                  {event.event_date && (
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(event.event_date), "yyyy/MM/dd HH:mm")}
                    </span>
                  )}
                </div>
                <p className="font-bold text-sm">{event.event_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">累計売上（モック）</p>
                <p className="font-black text-primary text-lg">¥{totalRevenue.toLocaleString()}</p>
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-card rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">販売済み</p>
                <p className="font-black text-green-400 text-xl">{totalSold}</p>
                <p className="text-[10px] text-muted-foreground">枚</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">残り枠</p>
                <p className="font-black text-foreground text-xl">{totalCapacity - totalSold}</p>
                <p className="text-[10px] text-muted-foreground">枚</p>
              </div>
              <div className="bg-card rounded-xl p-3 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">達成率</p>
                <p className={`font-black text-xl ${soldPct >= 80 ? "text-red-400" : soldPct >= 50 ? "text-yellow-400" : "text-primary"}`}>
                  {soldPct}%
                </p>
                <p className="text-[10px] text-muted-foreground">埋まり率</p>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>販売進捗</span>
                <span>{totalSold} / {totalCapacity} 枚</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                  style={{ width: `${soldPct}%` }}
                />
              </div>
            </div>

            {/* Bar chart */}
            {chartData.length > 0 && (
              <div>
                <p className="text-[11px] text-muted-foreground mb-2 font-semibold">種別ごとの販売状況</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} barGap={4} barSize={28}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="販売済み" fill={COLORS.sold} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="残り枠" fill={COLORS.remaining} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {soldPct >= 90 && (
              <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                残り枠が少なくなっています（{totalCapacity - totalSold}枚）
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}