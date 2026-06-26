import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { Eye, DollarSign, ShoppingCart, TrendingUp, ArrowLeft, Upload, Settings, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const COLORS = ["hsl(var(--primary))", "#60a5fa", "#f59e0b"];

export default function VodManagement() {
  const [user, setUser] = useState(null);
  const [priceFilter, setPriceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channel } = useQuery({
    queryKey: ["vod-channel", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then((r) => r[0]),
    enabled: !!user,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["vod-videos", channel?.id],
    queryFn: () => base44.entities.Video.filter({ channel_id: channel.id }, "-created_date"),
    enabled: !!channel,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["vod-purchases", channel?.id],
    queryFn: async () => {
      const allPurchases = await base44.entities.Purchase.filter({ item_type: "video" }, "-created_date", 500);
      return allPurchases.filter((p) => {
        const vid = videos.find((v) => v.id === p.item_id);
        return vid && vid.channel_id === channel?.id;
      });
    },
    enabled: !!channel && videos.length > 0,
  });

  // KPI計算
  const vodStats = useMemo(() => {
    const totalRevenue = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalSales = purchases.length;
    const avgPrice = videos.filter((v) => !v.is_free && v.price > 0).length > 0
      ? videos.filter((v) => !v.is_free && v.price > 0).reduce((sum, v) => sum + (v.price || 0), 0) / videos.filter((v) => !v.is_free && v.price > 0).length
      : 0;
    const totalViews = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);

    return { totalRevenue, totalSales, avgPrice, totalViews };
  }, [videos, purchases]);

  // 日別売上
  const dailySalesData = useMemo(() => {
    const map = {};
    purchases.forEach((p) => {
      const d = new Date(p.created_date || new Date()).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
      map[d] = (map[d] || 0) + (p.amount || 0);
    });
    return Object.entries(map).slice(-30).map(([date, amount]) => ({ date, amount }));
  }, [purchases]);

  // 動画別売上
  const videoSalesData = useMemo(() => {
    return videos
      .map((v) => {
        const sales = purchases.filter((p) => p.item_id === v.id).length;
        const revenue = purchases.filter((p) => p.item_id === v.id).reduce((sum, p) => sum + (p.amount || 0), 0);
        return {
          title: v.title.slice(0, 20) + (v.title.length > 20 ? "…" : ""),
          sales,
          revenue,
          views: v.view_count || 0,
          price: v.price || 0,
          is_free: v.is_free,
        };
      })
      .filter((v) => !v.is_free)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [videos, purchases]);

  // 価格帯別分布
  const priceDistribution = useMemo(() => {
    const ranges = [
      { label: "無料", min: 0, max: 0, count: 0 },
      { label: "￥100〜500", min: 100, max: 500, count: 0 },
      { label: "￥501〜1000", min: 501, max: 1000, count: 0 },
      { label: "￥1001〜2000", min: 1001, max: 2000, count: 0 },
      { label: "￥2001以上", min: 2001, max: Infinity, count: 0 },
    ];

    videos.forEach((v) => {
      const price = v.price || 0;
      const range = ranges.find((r) => price >= r.min && price <= r.max);
      if (range) range.count++;
    });

    return ranges.filter((r) => r.count > 0);
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      const matchPrice = !priceFilter || (v.price || 0).toString().includes(priceFilter);
      const matchStatus = statusFilter === "all" || (statusFilter === "free" ? v.is_free : !v.is_free);
      return matchPrice && matchStatus;
    });
  }, [videos, priceFilter, statusFilter]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/creator-dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" /> VOD管理ダッシュボード
            </h1>
            <p className="text-sm text-muted-foreground">配信アーカイブ・動画販売を一元管理</p>
          </div>
        </div>
        <Link to="/upload">
          <Button className="gap-2">
            <Upload className="w-4 h-4" /> 新しい動画をアップロード
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "総売上", value: `¥${Math.floor(vodStats.totalRevenue).toLocaleString()}`, icon: DollarSign, color: "text-green-400" },
          { label: "販売本数", value: vodStats.totalSales.toLocaleString(), icon: ShoppingCart, color: "text-blue-400" },
          { label: "平均価格", value: `¥${Math.round(vodStats.avgPrice).toLocaleString()}`, icon: Settings, color: "text-yellow-400" },
          { label: "総視聴数", value: vodStats.totalViews.toLocaleString(), icon: Eye, color: "text-primary" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-secondary flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="videos">動画一覧</TabsTrigger>
          <TabsTrigger value="sales">販売分析</TabsTrigger>
        </TabsList>

        {/* ── 概要 ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* 日別売上推移 */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> 日別売上推移
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailySalesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={dailySalesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="amount" name="売上" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12 text-sm">販売データがありません</p>
                )}
              </CardContent>
            </Card>

            {/* 価格帯分布 */}
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-400" /> 価格帯別動画数
                </CardTitle>
              </CardHeader>
              <CardContent>
                {priceDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={priceDistribution} cx="50%" cy="50%" outerRadius={75} dataKey="count" label={({ label, percent }) => `${label} ${Math.round(percent * 100)}%`}>
                        {priceDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-12 text-sm">動画がありません</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* インサイト */}
          <Card className="bg-gradient-to-br from-primary/5 to-card border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">💡 VOD収益最大化のコツ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-foreground/70">
              <p>• <strong>高視聴数・低売上</strong>の動画は価格を上げると収益が伸びやすいです</p>
              <p>• <strong>ライブアーカイブ</strong>は翌日から有料化して、再利用収益を作りましょう</p>
              <p>• <strong>30秒プレビュー</strong>で興味を引き、購入率を高めます</p>
              <p>• <strong>シリーズ化</strong>すると常連ファンの継続購入が見込めます</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 動画一覧 ── */}
        <TabsContent value="videos" className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="価格で検索..."
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="max-w-xs"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md bg-secondary border-0 text-sm text-foreground"
            >
              <option value="all">すべて</option>
              <option value="paid">有料</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredVideos.map((v) => {
              const sales = purchases.filter((p) => p.item_id === v.id).length;
              const revenue = purchases.filter((p) => p.item_id === v.id).reduce((sum, p) => sum + (p.amount || 0), 0);
              return (
                <div key={v.id} className="bg-card border border-border/50 rounded-xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-base text-foreground">{v.title}</h3>
                      {v.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{v.description}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${v.moderation_status === "approved" ? "bg-green-500/20 text-green-400" : v.moderation_status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}>
                      {v.moderation_status === "approved" ? "✓ 承認" : v.moderation_status === "pending" ? "⏳ 審査中" : "✗ 却下"}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                    <span>{v.is_free ? "無料" : `${(v.price || 0).toLocaleString()}コイン`}</span>
                    <span>視聴: {v.view_count || 0}</span>
                    <span className="text-blue-400 font-bold">売上: ¥{revenue.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ── 販売分析 ── */}
        <TabsContent value="sales" className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> 動画別売上ランキング
              </CardTitle>
            </CardHeader>
            <CardContent>
              {videoSalesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={videoSalesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="title" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "10px" }} angle={-20} textAnchor="end" height={80} />
                    <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Bar dataKey="revenue" name="売上（¥）" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sales" name="販売本数" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-12 text-sm">販売データがありません</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}