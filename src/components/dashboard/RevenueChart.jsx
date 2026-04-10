import React, { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-primary">¥{(payload[0]?.value || 0).toLocaleString()}</p>
    </div>
  );
};

export default function RevenueChart({ purchases = [], superChats = [], videoCalls = [] }) {
  const data = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const key = format(date, "yyyy-MM-dd");
      const label = format(date, "M/d");

      const dayPurchases = purchases
        .filter((p) => p.created_date?.startsWith(key))
        .reduce((s, p) => s + (p.amount || 0) * 0.85, 0);

      const dayChats = superChats
        .filter((c) => c.created_date?.startsWith(key))
        .reduce((s, c) => s + (c.amount || 0) * 0.9, 0);

      const dayCalls = videoCalls
        .filter((c) => c.created_date?.startsWith(key))
        .reduce((s, c) => s + (c.price || 0) * 0.85, 0);

      return { label, revenue: Math.round(dayPurchases + dayChats + dayCalls) };
    });
    return days;
  }, [purchases, superChats, videoCalls]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          interval={4}
        />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#revenueGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}