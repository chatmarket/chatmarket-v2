import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-blue-400">{(payload[0]?.value || 0).toLocaleString()} 人</p>
    </div>
  );
};

export default function ViewerChart({ liveStreams = [], videos = [] }) {
  const data = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const key = format(date, "yyyy-MM-dd");
      const label = format(date, "M/d");

      const streamViewers = liveStreams
        .filter((s) => s.created_date?.startsWith(key))
        .reduce((s, l) => s + (l.viewer_count || 0), 0);

      const videoViews = videos
        .filter((v) => v.created_date?.startsWith(key))
        .reduce((s, v) => s + (v.view_count || 0), 0);

      // モックデータ（実データが0の場合はランダム生成）
      const base = streamViewers + videoViews;
      const viewers = base > 0 ? base : Math.floor(Math.random() * 80 + 10);

      return { label, viewers };
    });
  }, [liveStreams, videos]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          interval={4}
        />
        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="viewers"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "#60a5fa" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}