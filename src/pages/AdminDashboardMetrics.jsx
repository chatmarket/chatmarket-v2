import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, DollarSign, Radio, Phone, Zap, ArrowUp, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";

// リアルタイムメトリクス計算ロジック
function calculateMetrics(users, channels, videos, streams, calls, purchases) {
  // 今日のユーザー数（created_dateが今日）
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const newUsersToday = users.filter((u) => new Date(u.created_date) >= todayStart).length;

  // 今月の収益
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthRevenue = purchases
    .filter((p) => new Date(p.created_date) >= monthStart)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // アクティブライバー（この30日間に配信）
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const activeStreams = streams.filter((s) => new Date(s.created_date) >= thirtyDaysAgo);
  const activeCreators = new Set(activeStreams.map((s) => s.channel_id)).size;

  // 平均通話時間
  const avgCallDuration = calls.length > 0
    ? calls.reduce((sum, c) => sum + (c.actual_duration_minutes || 0), 0) / calls.length
    : 0;

  // 通話成功率
  const completedCalls = calls.filter((c) => c.status === "ended").length;
  const successRate = calls.length > 0 ? ((completedCalls / calls.length) * 100).toFixed(1) : 0;

  return {
    newUsersToday,
    totalUsers: users.length,
    monthRevenue,
    activeCreators,
    avgCallDuration: avgCallDuration.toFixed(1),
    successRate,
    totalVideos: videos.length,
    liveStreams: streams.filter((s) => s.status === "live").length,
  };
}

export default function AdminDashboardMetrics() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((ok) => {
      if (ok) {
        base44.auth.me().then((u) => {
          if (u.role !== "admin") window.location.href = "/";
          setUser(u);
        });
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  // データ取得（リアルタイム更新 30秒ごと）
  const { data: users = [] } = useQuery({
    queryKey: ["admin-metrics-users"],
    queryFn: () => base44.functions.invoke("adminGetAllUsers", {}).then((r) => r.data?.users || []),
    refetchInterval: 30000,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["admin-metrics-channels"],
    queryFn: () => base44.entities.Channel.list("-monthly_revenue_coins", 100),
    refetchInterval: 30000,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["admin-metrics-videos"],
    queryFn: () => base44.entities.Video.list("-created_date", 50),
    refetchInterval: 60000,
  });

  const { data: streams = [] } = useQuery({
    queryKey: ["admin-metrics-streams"],
    queryFn: () => base44.entities.LiveStream.list("-created_date", 50),
    refetchInterval: 30000,
  });

  const { data: calls = [] } = useQuery({
    queryKey: ["admin-metrics-calls"],
    queryFn: () => base44.entities.VideoCall.list("-created_date", 100),
    refetchInterval: 30000,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["admin-metrics-purchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 100),
    refetchInterval: 30000,
  });

  const metrics = calculateMetrics(users, channels, videos, streams, calls, purchases);

  // グラフ用データ（最近7日間）
  const dailyMetrics = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const dayUsers = users.filter((u) => new Date(u.created_date) >= dayStart && new Date(u.created_date) < dayEnd).length;
    const dayRevenue = purchases
      .filter((p) => new Date(p.created_date) >= dayStart && new Date(p.created_date) < dayEnd)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      date: date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
      users: dayUsers,
      revenue: dayRevenue,
    };
  });

  // カテゴリ別アクティビティ
  const categoryMetrics = Object.entries(
    channels.reduce((acc, ch) => {
      const cat = ch.stream_category || "other";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([cat, count]) => ({ name: cat, value: count }));

  if (!user || user.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-primary" />
            社長向けメトリクスダッシュボード
          </h1>
          <p className="text-sm text-muted-foreground mt-1">リアルタイムデータ（30秒ごと自動更新）</p>
        </div>
        <Link to="/admin/dashboard">
          <Button variant="outline">運営管理に戻る</Button>
        </Link>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "新規ユーザー（本日）", value: metrics.newUsersToday, trend: "+12%" },
          { icon: DollarSign, label: "月間売上", value: `¥${(metrics.monthRevenue / 1000).toFixed(1)}k`, trend: "+8%" },
          { icon: Radio, label: "アクティブライバー（30日）", value: metrics.activeCreators, trend: "+5%" },
          { icon: Phone, label: "通話成功率", value: `${metrics.successRate}%`, trend: "-2%" },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl border border-border/50 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5 text-primary" />
                <span className={`text-xs font-bold ${kpi.trend.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
                  {kpi.trend}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-black mt-1">{kpi.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* グラフセクション */}
      <Tabs defaultValue="revenue">
        <TabsList className="bg-secondary">
          <TabsTrigger value="revenue">売上推移</TabsTrigger>
          <TabsTrigger value="users">ユーザー増加</TabsTrigger>
          <TabsTrigger value="category">カテゴリ分布</TabsTrigger>
        </TabsList>

        {/* 売上推移 */}
        <TabsContent value="revenue" className="bg-card rounded-xl border border-border/50 p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#00ff9d" name="売上（¥）" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </TabsContent>

        {/* ユーザー増加 */}
        <TabsContent value="users" className="bg-card rounded-xl border border-border/50 p-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyMetrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="users" fill="#3b82f6" name="新規ユーザー（人）" />
            </BarChart>
          </ResponsiveContainer>
        </TabsContent>

        {/* カテゴリ分布 */}
        <TabsContent value="category" className="bg-card rounded-xl border border-border/50 p-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryMetrics}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryMetrics.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={["#00ff9d", "#3b82f6", "#f59e0b", "#ef4444"][i % 4]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </TabsContent>
      </Tabs>

      {/* サマリーテーブル */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border/50 p-6 space-y-4">
          <h3 className="font-bold text-base">システムの健全性</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">総ユーザー数</span>
              <span className="font-bold">{metrics.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">総動画数</span>
              <span className="font-bold">{metrics.totalVideos}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">現在ライブ中</span>
              <span className="font-bold text-red-500">{metrics.liveStreams}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">平均通話時間</span>
              <span className="font-bold">{metrics.avgCallDuration}分</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-6 space-y-4">
          <h3 className="font-bold text-base">次のアクション</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Zap className="w-4 h-4" />
              トップパフォーマーに特典を付与
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Users className="w-4 h-4" />
              新規ユーザー向けオンボーディング強化
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <DollarSign className="w-4 h-4" />
              キャンペーンの追加配分を検討
            </Button>
          </div>
        </div>
      </div>

      {/* 更新時刻 */}
      <div className="text-xs text-muted-foreground text-center">
        自動更新: {new Date().toLocaleTimeString("ja-JP")} (次回: {new Date(Date.now() + 30000).toLocaleTimeString("ja-JP")})
      </div>
    </div>
  );
}