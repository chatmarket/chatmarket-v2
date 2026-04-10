import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { format, subDays, parseISO, startOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { ShieldAlert, TrendingUp, AlertTriangle, BarChart2, Radio, MessageCircle, PhoneCall } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const RANGE_OPTIONS = [
  { label: "7日間", days: 7 },
  { label: "14日間", days: 14 },
  { label: "30日間", days: 30 },
];

const CONTEXT_COLORS = {
  livestream: "#22c55e",
  videocall: "#38bdf8",
  chat: "#f59e0b",
};

const CONTEXT_LABELS = {
  livestream: "ライブ配信",
  videocall: "ビデオ通話",
  chat: "チャット",
};

const CONTEXT_ICONS = {
  livestream: Radio,
  videocall: PhoneCall,
  chat: MessageCircle,
};

const BAR_COLORS = [
  "#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#14b8a6",
];

// カスタムツールチップ
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/60 rounded-xl px-4 py-3 shadow-xl text-xs space-y-1">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{CONTEXT_LABELS[p.dataKey] || p.dataKey}:</span>
          <span className="font-bold text-foreground">{p.value}件</span>
        </div>
      ))}
    </div>
  );
}

export default function NgWordAnalytics() {
  const [rangeDays, setRangeDays] = useState(7);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["ng-word-logs"],
    queryFn: () => base44.entities.NgWordLog.list("-detected_at", 500),
  });

  // 指定日数以内のログ
  const rangeStart = startOfDay(subDays(new Date(), rangeDays - 1));
  const filteredLogs = useMemo(
    () => logs.filter((l) => new Date(l.detected_at || l.created_date) >= rangeStart),
    [logs, rangeDays]
  );

  // 日別推移データ（コンテキスト別積み上げ）
  const dailyData = useMemo(() => {
    const map = {};
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MM/dd");
      map[d] = { date: d, livestream: 0, videocall: 0, chat: 0 };
    }
    filteredLogs.forEach((l) => {
      const d = format(new Date(l.detected_at || l.created_date), "MM/dd");
      if (map[d]) {
        const ctx = l.context || "chat";
        map[d][ctx] = (map[d][ctx] || 0) + 1;
      }
    });
    return Object.values(map);
  }, [filteredLogs, rangeDays]);

  // NGワード上位ランキング
  const wordRanking = useMemo(() => {
    const count = {};
    filteredLogs.forEach((l) => {
      count[l.word] = (count[l.word] || 0) + 1;
    });
    return Object.entries(count)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, cnt]) => ({ word, count: cnt }));
  }, [filteredLogs]);

  // コンテキスト別合計
  const contextTotals = useMemo(() => {
    const totals = { livestream: 0, videocall: 0, chat: 0 };
    filteredLogs.forEach((l) => {
      const ctx = l.context || "chat";
      totals[ctx] = (totals[ctx] || 0) + 1;
    });
    return totals;
  }, [filteredLogs]);

  const totalCount = filteredLogs.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">NGワード 検知分析</h1>
            <p className="text-xs text-muted-foreground">管理者専用 · 音声・チャット解析ログ</p>
          </div>
        </div>

        {/* 期間切り替え */}
        <div className="flex gap-1 bg-secondary rounded-lg p-1">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.days}
              size="sm"
              variant={rangeDays === opt.days ? "default" : "ghost"}
              onClick={() => setRangeDays(opt.days)}
              className="text-xs h-7 px-3"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground">総検知件数</p>
          <p className="text-3xl font-black text-red-400">{totalCount}</p>
          <p className="text-xs text-muted-foreground">過去{rangeDays}日間</p>
        </div>
        {Object.entries(contextTotals).map(([ctx, cnt]) => {
          const Icon = CONTEXT_ICONS[ctx];
          return (
            <div key={ctx} className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5" style={{ color: CONTEXT_COLORS[ctx] }} />
                {CONTEXT_LABELS[ctx]}
              </div>
              <p className="text-3xl font-black" style={{ color: CONTEXT_COLORS[ctx] }}>{cnt}</p>
              <p className="text-xs text-muted-foreground">
                {totalCount > 0 ? Math.round((cnt / totalCount) * 100) : 0}%
              </p>
            </div>
          );
        })}
      </div>

      {/* 日別推移グラフ */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-bold">日別 NGワード検知推移</h2>
        </div>
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
            <BarChart2 className="w-8 h-8 opacity-30" />
            <p className="text-sm">この期間のデータはありません</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailyData} barSize={14} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--secondary))" }} />
              <Legend
                formatter={(val) => <span className="text-xs text-muted-foreground">{CONTEXT_LABELS[val] || val}</span>}
              />
              {Object.keys(CONTEXT_COLORS).map((ctx) => (
                <Bar key={ctx} dataKey={ctx} stackId="a" fill={CONTEXT_COLORS[ctx]} radius={ctx === "chat" ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 2カラム: 上位ワードランキング + 折れ線（合計推移） */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 上位NGワードランキング */}
        <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <h2 className="font-bold">よく検出されるNGワード TOP10</h2>
          </div>
          {wordRanking.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <AlertTriangle className="w-7 h-7 opacity-30" />
              <p className="text-sm">データなし</p>
            </div>
          ) : (
            <div className="space-y-2">
              {wordRanking.map(({ word, count }, idx) => {
                const max = wordRanking[0].count;
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={word} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-mono font-bold truncate">{word}</span>
                        <Badge variant="secondary" className="text-xs ml-2 shrink-0">{count}件</Badge>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: BAR_COLORS[idx % BAR_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 合計件数の折れ線グラフ */}
        <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            <h2 className="font-bold">日別 合計件数トレンド</h2>
          </div>
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground gap-2">
              <TrendingUp className="w-7 h-7 opacity-30" />
              <p className="text-sm">データなし</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData.map((d) => ({
                ...d,
                total: (d.livestream || 0) + (d.videocall || 0) + (d.chat || 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(v) => [`${v}件`, "合計"]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ fill: "#ef4444", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 最近の検出ログ */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <h2 className="font-bold">最近の検出ログ</h2>
        {filteredLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">ログがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-2 px-3 font-semibold">検出日時</th>
                  <th className="text-left py-2 px-3 font-semibold">NGワード</th>
                  <th className="text-left py-2 px-3 font-semibold">チャンネル</th>
                  <th className="text-left py-2 px-3 font-semibold">コンテキスト</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 20).map((log) => {
                  const ctx = log.context || "chat";
                  return (
                    <tr key={log.id} className="border-b border-border/20 hover:bg-secondary/40 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground font-mono">
                        {format(new Date(log.detected_at || log.created_date), "MM/dd HH:mm")}
                      </td>
                      <td className="py-2 px-3 font-bold font-mono text-red-400">{log.word}</td>
                      <td className="py-2 px-3 text-muted-foreground">{log.channel_name || "—"}</td>
                      <td className="py-2 px-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: `${CONTEXT_COLORS[ctx]}22`,
                            color: CONTEXT_COLORS[ctx],
                          }}
                        >
                          {CONTEXT_LABELS[ctx]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredLogs.length > 20 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                表示: 20件 / 全{filteredLogs.length}件
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}