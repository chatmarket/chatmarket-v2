import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Globe, Users, Eye, TrendingUp, MapPin, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SUPER_ADMIN_EMAILS = ["ono@onestep-corp.com", "taktak0315@icloud.com", "unei@chatmarket.info"];

// 日本の都道府県（簡易版 — 実装の為のダミー）
const REGIONS = [
  "東京", "大阪", "愛知", "福岡", "京都", "埼玉", "神奈川", "兵庫", "その他"
];

export default function AdminAnalytics() {
  const [user, setUser] = useState(null);
  const [period, setPeriod] = useState("week"); // week, month, year
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          setUser(u);
          if (!SUPER_ADMIN_EMAILS.includes(u.email)) {
            // リダイレクトまたはエラー表示
            window.location.href = "/";
          }
        });
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  // ビデオアクセス数
  const { data: videos = [] } = useQuery({
    queryKey: ["admin-analytics-videos"],
    queryFn: () => base44.entities.Video.list("-view_count", 100),
    enabled: !!user,
  });

  // ライブストリーム統計
  const { data: liveStreams = [] } = useQuery({
    queryKey: ["admin-analytics-streams"],
    queryFn: () => base44.entities.LiveStream.filter({ status: "ended" }, "-live_ended_at", 50),
    enabled: !!user,
  });

  // 購入レコード
  const { data: purchases = [] } = useQuery({
    queryKey: ["admin-analytics-purchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 200),
    enabled: !!user,
  });

  // ユーザー統計
  const { data: users = [] } = useQuery({
    queryKey: ["admin-analytics-users"],
    queryFn: () => base44.entities.User.list("-created_date", 100),
    enabled: !!user,
  });

  // チャンネル統計
  const { data: channels = [] } = useQuery({
    queryKey: ["admin-analytics-channels"],
    queryFn: () => base44.entities.Channel.list("-subscriber_count", 100),
    enabled: !!user,
  });

  // データ処理
  const totalVideoViews = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);
  const totalPurchases = purchases.length;
  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalLiveStreams = liveStreams.length;
  const totalLiveRevenue = liveStreams.reduce((sum, s) => sum + (s.revenue_coins || 0), 0);
  const totalUsers = users.length;
  const totalCreators = channels.length;

  // 地域別ビューアー数（ダミー）
  const regionData = REGIONS.map((region) => ({
    name: region,
    viewers: Math.floor(Math.random() * 50000) + 5000,
  }));

  // 日別アクセス数（過去7日 — ダミー）
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
      views: Math.floor(Math.random() * 100000) + 10000,
      purchases: Math.floor(Math.random() * 500) + 50,
    };
  });

  // トップビデオ
  const topVideos = videos.slice(0, 5);

  // トップクリエイター
  const topCreators = channels.slice(0, 5);

  const COLORS = ["#00ff9d", "#00d4ff", "#f59e0b", "#ef4444", "#a855f7", "#ec4899"];

  if (!user || !SUPER_ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        アクセス権がありません。スーパー管理者のみ利用可能です。
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-full overflow-x-hidden">
      {/* ===== ヘッダー ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">📊 プラットフォーム分析</h1>
          <p className="text-sm text-muted-foreground mt-1">リアルタイム統計とインサイト</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40 bg-secondary border-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">過去7日間</SelectItem>
            <SelectItem value="month">過去30日間</SelectItem>
            <SelectItem value="year">過去1年</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ===== KPI カード ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "総ビデオ再生数", value: totalVideoViews.toLocaleString(), icon: Eye, color: "text-blue-400" },
          { label: "総ユーザー数", value: totalUsers.toLocaleString(), icon: Users, color: "text-green-400" },
          { label: "登録クリエイター数", value: totalCreators.toLocaleString(), icon: Globe, color: "text-primary" },
          { label: "総購入数", value: totalPurchases.toLocaleString(), icon: TrendingUp, color: "text-yellow-400" },
          { label: "購入総額（¥）", value: `¥${totalPurchaseAmount.toLocaleString()}`, icon: TrendingUp, color: "text-amber-400" },
          { label: "ライブ配信数", value: totalLiveStreams.toLocaleString(), icon: Globe, color: "text-red-400" },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card key={i} className="bg-card border-border/50 hover:border-primary/30 transition-all">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-semibold">{kpi.label}</p>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <p className="text-2xl font-black">{kpi.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ===== グラフ類 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 日別アクセス数 */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              日別アクセス数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#888" style={{ fontSize: "12px" }} />
                <YAxis stroke="#888" style={{ fontSize: "12px" }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #00ff9d" }} />
                <Legend />
                <Line type="monotone" dataKey="views" stroke="#00ff9d" strokeWidth={2} dot={false} name="再生数" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 地域別ビューアー分布 */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MapPin className="w-5 h-5 text-primary" />
              地域別ビューアー分布
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={regionData} cx="50%" cy="50%" labelLine={false} label={({ name }) => name} outerRadius={100} fill="#8884d8" dataKey="viewers">
                  {regionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #00ff9d" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 購入トレンド */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              日別購入数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#888" style={{ fontSize: "12px" }} />
                <YAxis stroke="#888" style={{ fontSize: "12px" }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #00ff9d" }} />
                <Legend />
                <Bar dataKey="purchases" fill="#f59e0b" radius={4} name="購入数" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ユーザー登録トレンド */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="w-5 h-5 text-primary" />
              ユーザー登録数（日別）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#888" style={{ fontSize: "12px" }} />
                <YAxis stroke="#888" style={{ fontSize: "12px" }} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #00ff9d" }} />
                <Legend />
                <Bar dataKey="views" fill="#00d4ff" radius={4} name="登録数" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ===== トップコンテンツ ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* トップビデオ */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">🎬 トップビデオ（再生数）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topVideos.length > 0 ? (
                topVideos.map((video, i) => (
                  <div key={video.id} className="flex items-start gap-3 pb-3 border-b border-border/30 last:border-b-0">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 font-bold text-xs text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate">{video.title}</p>
                      <p className="text-[10px] text-muted-foreground">チャンネル: {video.channel_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-primary">{video.view_count?.toLocaleString() || 0}</p>
                      <p className="text-[9px] text-muted-foreground">再生数</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">データなし</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* トップクリエイター */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">👑 トップクリエイター（登録者数）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCreators.length > 0 ? (
                topCreators.map((creator, i) => (
                  <div key={creator.id} className="flex items-start gap-3 pb-3 border-b border-border/30 last:border-b-0">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 font-bold text-xs text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold truncate">{creator.name}</p>
                      <p className="text-[10px] text-muted-foreground">{creator.owner_email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-black text-primary">{creator.subscriber_count?.toLocaleString() || 0}</p>
                      <p className="text-[9px] text-muted-foreground">登録者</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">データなし</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== サマリー ===== */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">📈 プラットフォーム総括</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="font-semibold text-foreground">総ビデオ再生数:</span>{" "}
            <span className="text-primary font-bold">{totalVideoViews.toLocaleString()}</span>
          </p>
          <p>
            <span className="font-semibold text-foreground">平均購入額:</span>{" "}
            <span className="text-primary font-bold">
              ¥{totalPurchases > 0 ? Math.round(totalPurchaseAmount / totalPurchases).toLocaleString() : 0}
            </span>
          </p>
          <p>
            <span className="font-semibold text-foreground">ユーザーあたり平均購入数:</span>{" "}
            <span className="text-primary font-bold">
              {totalUsers > 0 ? (totalPurchases / totalUsers).toFixed(2) : 0}
            </span>
          </p>
          <p>
            <span className="font-semibold text-foreground">ライブ配信総収益（コイン）:</span>{" "}
            <span className="text-primary font-bold">{totalLiveRevenue.toLocaleString()}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}