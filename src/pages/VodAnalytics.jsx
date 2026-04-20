import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, ShoppingCart, TrendingUp, ArrowLeft, Trophy, Film, Crown } from "lucide-react";
import { Link } from "react-router-dom";

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" },
  labelStyle: { color: "hsl(var(--foreground))" },
};

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309", "hsl(var(--primary))"];

export default function VodAnalytics() {
  const [user, setUser] = useState(null);
  const [sortBy, setSortBy] = useState("revenue"); // revenue | views | purchases

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channel } = useQuery({
    queryKey: ["vod-analytics-channel", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then((r) => r[0]),
    enabled: !!user,
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ["vod-analytics-videos", channel?.id],
    queryFn: () => base44.entities.Video.filter({ channel_id: channel.id }, "-created_date", 100),
    enabled: !!channel,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["vod-analytics-purchases", channel?.id],
    queryFn: () => base44.entities.Purchase.filter({ item_type: "video", status: "completed" }, "-created_date", 1000),
    enabled: !!channel,
  });

  const { data: watchHistory = [] } = useQuery({
    queryKey: ["vod-analytics-history"],
    queryFn: () => base44.entities.WatchHistory.list("-created_date", 3000),
    enabled: !!channel,
  });

  // 動画ごとに集計
  const videoStats = useMemo(() => {
    const videoIds = new Set(videos.map((v) => v.id));
    return videos.map((v) => {
      const viewCount = watchHistory.filter((w) => w.video_id === v.id).length;
      const videoPurchases = purchases.filter((p) => p.item_id === v.id);
      const purchaseCount = videoPurchases.length;
      const grossRevenue = videoPurchases.reduce((s, p) => s + (p.amount || 0), 0);
      const estimatedRevenue = Math.floor(grossRevenue * 0.85); // 85% 還元

      return {
        id: v.id,
        title: v.title,
        shortTitle: v.title.length > 16 ? v.title.slice(0, 16) + "…" : v.title,
        thumbnail: v.thumbnail_url,
        is_free: v.is_free,
        price: v.price || 0,
        viewCount: v.view_count || viewCount, // エンティティの値を優先
        purchaseCount,
        grossRevenue,
        estimatedRevenue,
        moderation_status: v.moderation_status,
        created_date: v.created_date,
      };
    });
  }, [videos, purchases, watchHistory]);

  const sortedStats = useMemo(() => {
    return [...videoStats].sort((a, b) => {
      if (sortBy === "revenue") return b.estimatedRevenue - a.estimatedRevenue;
      if (sortBy === "views") return b.viewCount - a.viewCount;
      if (sortBy === "purchases") return b.purchaseCount - a.purchaseCount;
      return 0;
    });
  }, [videoStats, sortBy]);

  // サマリー
  const totalViews = useMemo(() => videoStats.reduce((s, v) => s + v.viewCount, 0), [videoStats]);
  const totalPurchases = useMemo(() => videoStats.reduce((s, v) => s + v.purchaseCount, 0), [videoStats]);
  const totalRevenue = useMemo(() => videoStats.reduce((s, v) => s + v.estimatedRevenue, 0), [videoStats]);
  const topVideo = sortedStats[0];

  const chartData = sortedStats.slice(0, 10);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/creator-dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Film className="w-6 h-6 text-primary" /> VOD 動画分析
          </h1>
          <p className="text-sm text-muted-foreground">動画ごとの再生回数・購入数・推定収益を比較</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "動画本数", value: `${videos.length}本`, icon: Film, color: "text-blue-400" },
          { label: "総再生回数", value: totalViews.toLocaleString(), icon: Eye, color: "text-primary" },
          { label: "総購入数", value: `${totalPurchases}件`, icon: ShoppingCart, color: "text-yellow-400" },
          { label: "推定総収益", value: `¥${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-green-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card border-border/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`text-xl font-black ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Video Banner */}
      {topVideo && topVideo.estimatedRevenue > 0 && (
        <Card className="bg-gradient-to-r from-yellow-500/10 to-card border-yellow-500/30">
          <CardContent className="pt-4 pb-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            {topVideo.thumbnail && (
              <img src={topVideo.thumbnail} alt="" className="w-16 h-10 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-yellow-400 font-bold">👑 最高収益動画</p>
              <p className="font-bold truncate">{topVideo.title}</p>
            </div>
            <div className="text-right shrink-0 space-y-0.5">
              <p className="text-green-400 font-black text-lg">¥{topVideo.estimatedRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{topVideo.viewCount}再生 / {topVideo.purchaseCount}件購入</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sort Tabs */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground mr-1">並び替え:</span>
        {[
          { key: "revenue", label: "推定収益" },
          { key: "views", label: "再生回数" },
          { key: "purchases", label: "購入数" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              sortBy === key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary text-muted-foreground border-border/50 hover:border-primary/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bar Charts */}
      <div className="grid md:grid-cols-1 gap-4">
        {/* 推定収益グラフ */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-green-400" /> 動画別 推定収益（上位10本）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="shortTitle" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "10px" }} angle={-30} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} tickFormatter={(v) => `¥${v}`} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`¥${v.toLocaleString()}`, "推定収益"]} />
                  <Bar dataKey="estimatedRevenue" name="推定収益" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "hsl(var(--primary))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-16 text-sm">データがありません</p>
            )}
          </CardContent>
        </Card>

        {/* 再生回数 & 購入数グラフ */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="w-4 h-4 text-primary" /> 動画別 再生回数 & 購入数（上位10本）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="shortTitle" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "10px" }} angle={-30} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "11px" }} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend />
                  <Bar dataKey="viewCount" name="再生回数" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchaseCount" name="購入数" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-16 text-sm">データがありません</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="w-4 h-4 text-yellow-400" /> 動画別 詳細データ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {videosLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : sortedStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">動画がありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground text-xs">
                    <th className="text-left py-2.5 px-3">順位</th>
                    <th className="text-left py-2.5 px-3">動画タイトル</th>
                    <th className="text-center py-2.5 px-3">状態</th>
                    <th className="text-right py-2.5 px-3">価格</th>
                    <th className="text-right py-2.5 px-3">再生回数</th>
                    <th className="text-right py-2.5 px-3">購入数</th>
                    <th className="text-right py-2.5 px-3">推定収益</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStats.map((v, i) => (
                    <tr key={v.id} className={`border-b border-border/30 hover:bg-secondary/50 transition-colors ${i === 0 ? "bg-yellow-500/5" : ""}`}>
                      <td className="py-2.5 px-3">
                        {i === 0 ? <span className="text-yellow-400 font-black">🥇</span>
                          : i === 1 ? <span className="text-slate-400 font-black">🥈</span>
                          : i === 2 ? <span className="text-amber-600 font-black">🥉</span>
                          : <span className="text-muted-foreground text-xs">{i + 1}</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {v.thumbnail && (
                            <img src={v.thumbnail} alt="" className="w-10 h-7 rounded object-cover shrink-0" />
                          )}
                          <span className="font-medium text-sm line-clamp-1 max-w-[180px]">{v.title}</span>
                        </div>
                      </td>
                      <td className="text-center py-2.5 px-3">
                        {v.moderation_status === "approved" ? (
                          <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-2 py-0.5">公開中</span>
                        ) : v.moderation_status === "rejected" ? (
                          <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5">却下</span>
                        ) : (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5">審査中</span>
                        )}
                      </td>
                      <td className="text-right py-2.5 px-3">
                        {v.is_free ? (
                          <span className="text-primary text-xs font-bold">FREE</span>
                        ) : (
                          <span className="text-xs">¥{v.price.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="text-right py-2.5 px-3 font-semibold">{v.viewCount.toLocaleString()}</td>
                      <td className="text-right py-2.5 px-3 font-semibold text-yellow-400">{v.purchaseCount}</td>
                      <td className="text-right py-2.5 px-3 font-black text-green-400">
                        {v.is_free ? <span className="text-muted-foreground text-xs">—</span> : `¥${v.estimatedRevenue.toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note */}
      <p className="text-xs text-muted-foreground text-center">
        ※ 推定収益 = 購入金額 × 85%（プラットフォーム手数料15%を除いた概算）
      </p>
    </div>
  );
}