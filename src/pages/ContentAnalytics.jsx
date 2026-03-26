import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Eye, DollarSign, Clock, TrendingUp, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function ContentAnalytics() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then(setUser).catch(() => {});
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  // Fetch user's videos
  const { data: videos = [] } = useQuery({
    queryKey: ["user-videos", user?.email],
    queryFn: () => base44.entities.Video.filter({ channel_id: user?.channel_id }, "-created_date"),
    enabled: !!user?.email,
  });

  // Fetch user's blog posts
  const { data: blogPosts = [] } = useQuery({
    queryKey: ["user-blog-posts", user?.email],
    queryFn: () => base44.entities.BlogPost.filter({ author_name: user?.full_name }, "-published_at"),
    enabled: !!user?.email,
  });

  // Fetch purchases for revenue
  const { data: allPurchases = [] } = useQuery({
    queryKey: ["user-purchases", user?.email],
    queryFn: () => base44.entities.Purchase.list("-created_date", 1000),
  });

  // Fetch watch history for view analytics
  const { data: allWatchHistory = [] } = useQuery({
    queryKey: ["watch-history-all"],
    queryFn: () => base44.entities.WatchHistory.list("-created_date", 1000),
  });

  if (!user) return null;

  // Filter data for this user
  const userVideoIds = videos.map((v) => v.id);
  const userRevenue = allPurchases.filter((p) => userVideoIds.includes(p.item_id)).reduce((sum, p) => sum + (p.amount || 0), 0);
  const userViewCount = allWatchHistory.filter((w) => userVideoIds.includes(w.video_id)).length;

  // Prepare chart data - daily views
  const dailyViews = {};
  allWatchHistory.filter((w) => userVideoIds.includes(w.video_id)).forEach((w) => {
    const date = new Date(w.created_date).toLocaleDateString("ja-JP");
    dailyViews[date] = (dailyViews[date] || 0) + 1;
  });
  const dailyViewsData = Object.entries(dailyViews).map(([date, count]) => ({ date, views: count }));

  // Prepare chart data - video performance
  const videoPerformance = videos.map((v) => ({
    title: v.title,
    views: allWatchHistory.filter((w) => w.video_id === v.id).length,
    revenue: allPurchases.filter((p) => p.item_id === v.id && p.item_type === "video").reduce((sum, p) => sum + (p.amount || 0), 0),
  }));

  // Prepare chart data - revenue by video
  const revenueByVideo = videoPerformance.filter((v) => v.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Chart colors
  const COLORS = ["#00C49F", "#0088FE", "#FFBB28", "#FF8042", "#FF6B9D"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-primary" />
              コンテンツ分析
            </h1>
            <p className="text-sm text-muted-foreground mt-1">動画と記事のパフォーマンスを追跡</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground">総視聴回数</CardTitle>
              <Eye className="w-4 h-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-primary">{userViewCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">すべてのコンテンツ</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground">総収益</CardTitle>
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-green-400">¥{userRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">動画販売から</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground">公開動画数</CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-blue-400">{videos.filter((v) => v.moderation_status === "approved").length}</p>
            <p className="text-xs text-muted-foreground mt-1">承認済み</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground">平均視聴数</CardTitle>
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-yellow-400">
              {videos.length > 0 ? Math.round(userViewCount / videos.length) : 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">1動画あたり</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="daily-views" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="daily-views">日別視聴数</TabsTrigger>
          <TabsTrigger value="video-performance">動画パフォーマンス</TabsTrigger>
          <TabsTrigger value="revenue">収益分析</TabsTrigger>
        </TabsList>

        {/* Daily Views Chart */}
        <TabsContent value="daily-views">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>日別視聴数推移</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyViewsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyViewsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                    <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  データがありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Video Performance Chart */}
        <TabsContent value="video-performance">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>動画別視聴数（トップ10）</CardTitle>
            </CardHeader>
            <CardContent>
              {videoPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={videoPerformance.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                    <YAxis dataKey="title" type="category" width={150} stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="views" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  データがありません
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Chart */}
        <TabsContent value="revenue" className="space-y-6">
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>動画別収益（トップ10）</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueByVideo.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueByVideo}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="title" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value) => `¥${value.toLocaleString()}`}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  収益データがありません
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue Summary Table */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle>収益詳細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-3 font-semibold">動画タイトル</th>
                      <th className="text-right py-2 px-3 font-semibold">視聴数</th>
                      <th className="text-right py-2 px-3 font-semibold">収益</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videoPerformance
                      .filter((v) => v.revenue > 0)
                      .sort((a, b) => b.revenue - a.revenue)
                      .map((video) => (
                        <tr key={video.title} className="border-b border-border/30 hover:bg-secondary/50">
                          <td className="py-2 px-3 truncate">{video.title}</td>
                          <td className="text-right py-2 px-3">{video.views.toLocaleString()}</td>
                          <td className="text-right py-2 px-3 font-semibold text-green-400">¥{video.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}