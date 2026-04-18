import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Globe, Users, Eye, TrendingUp, Calendar, Activity, MessageSquare, Video, Radio, Coins } from "lucide-react";

const SUPER_ADMIN_EMAILS = ["ono@onestep-corp.com", "taktak0315@icloud.com", "unei@chatmarket.info"];

export default function AdminAnalytics() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          setUser(u);
          if (!SUPER_ADMIN_EMAILS.includes(u.email)) {
            window.location.href = "/";
          }
        });
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  const { data: videos = [] } = useQuery({
    queryKey: ["admin-analytics-videos"],
    queryFn: () => base44.entities.Video.list("-view_count", 100),
    enabled: !!user,
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ["admin-analytics-streams"],
    queryFn: () => base44.entities.LiveStream.filter({ status: "ended" }, "-live_ended_at", 200),
    enabled: !!user,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["admin-analytics-purchases"],
    queryFn: () => base44.entities.Purchase.list("-created_date", 500),
    enabled: !!user,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-analytics-users"],
    queryFn: () => base44.entities.User.list("-created_date", 500),
    enabled: !!user,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["admin-analytics-channels"],
    queryFn: () => base44.entities.Channel.list("-subscriber_count", 100),
    enabled: !!user,
  });

  const { data: watchHistory = [] } = useQuery({
    queryKey: ["admin-analytics-watch-history"],
    queryFn: () => base44.entities.WatchHistory.list("-created_date", 1000),
    enabled: !!user,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["admin-analytics-comments"],
    queryFn: () => base44.entities.Comment.list("-created_date", 500),
    enabled: !!user,
  });

  const { data: videoCalls = [] } = useQuery({
    queryKey: ["admin-analytics-video-calls"],
    queryFn: () => base44.entities.VideoCall.list("-created_date", 500),
    enabled: !!user,
  });

  const { data: superChats = [] } = useQuery({
    queryKey: ["admin-analytics-superchats"],
    queryFn: () => base44.entities.SuperChat.list("-created_date", 500),
    enabled: !!user,
  });

  const { data: allLiveStreams = [] } = useQuery({
    queryKey: ["admin-analytics-all-streams"],
    queryFn: () => base44.entities.LiveStream.list("-created_date", 500),
    enabled: !!user,
  });

  // KPI集計（実データのみ）
  const totalVideoViews = videos.reduce((sum, v) => sum + (v.view_count || 0), 0);
  const totalPurchases = purchases.length;
  const totalPurchaseAmount = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalLiveStreams = liveStreams.length;
  const totalLiveRevenue = liveStreams.reduce((sum, s) => sum + (s.revenue_coins || 0), 0);
  const totalUsers = users.length;
  const totalCreators = channels.length;

  // アクセス・エンゲージメント指標
  const totalPageViews = watchHistory.length; // 動画視聴アクセス数
  const totalComments = comments.length;
  const totalVideoCalls = videoCalls.length;
  const completedCalls = videoCalls.filter(c => c.status === "ended").length;
  const totalSuperChatAmount = superChats.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalLiveSessions = allLiveStreams.length;

  // 過去30日アクセス数（WatchHistory）
  const viewsByDay = watchHistory.reduce((acc, w) => {
    if (!w.created_date) return acc;
    const d = new Date(w.created_date);
    const key = d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", timeZone: "Asia/Tokyo" });
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const dailyViewData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", timeZone: "Asia/Tokyo" });
    return { date: key, views: viewsByDay[key] || 0 };
  });

  // 過去30日コメント数
  const commentsByDay = comments.reduce((acc, c) => {
    if (!c.created_date) return acc;
    const d = new Date(c.created_date);
    const key = d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", timeZone: "Asia/Tokyo" });
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // 日別購入数（実データから集計）
  const purchaseByDay = purchases.reduce((acc, p) => {
    if (!p.created_date) return acc;
    const d = new Date(p.created_date);
    const key = d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", timeZone: "Asia/Tokyo" });
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // 過去30日のみ表示
  const dailyPurchaseData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", timeZone: "Asia/Tokyo" });
    return { date: key, purchases: purchaseByDay[key] || 0 };
  });

  // 日別ユーザー登録数（実データから集計）
  const userByDay = users.reduce((acc, u) => {
    if (!u.created_date) return acc;
    const d = new Date(u.created_date);
    const key = d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", timeZone: "Asia/Tokyo" });
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const dailyUserData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", timeZone: "Asia/Tokyo" });
    return { date: key, registrations: userByDay[key] || 0 };
  });

  // トップビデオ・クリエイター
  const topVideos = videos.slice(0, 5);
  const topCreators = channels.slice(0, 5);

  if (!user || !SUPER_ADMIN_EMAILS.includes(user.email)) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        アクセス権がありません。スーパー管理者のみ利用可能です。
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-full overflow-x-hidden">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black">📊 プラットフォーム分析</h1>
        <p className="text-sm text-muted-foreground mt-1">実稼働データのみ表示（過去30日）</p>
      </div>

      {/* アクセス・エンゲージメントKPI */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">📡 アクセス・エンゲージメント</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: "動画視聴アクセス数", value: totalPageViews.toLocaleString(), icon: Activity, color: "text-cyan-400", sub: "WatchHistory累計" },
            { label: "総ビデオ再生数", value: totalVideoViews.toLocaleString(), icon: Eye, color: "text-blue-400", sub: "view_count合計" },
            { label: "コメント総数", value: totalComments.toLocaleString(), icon: MessageSquare, color: "text-purple-400", sub: "全コメント" },
            { label: "ライブ配信総数", value: totalLiveSessions.toLocaleString(), icon: Radio, color: "text-red-400", sub: "全ステータス" },
            { label: "ビデオ通話総数", value: totalVideoCalls.toLocaleString(), icon: Video, color: "text-orange-400", sub: `完了: ${completedCalls}件` },
            { label: "スパチャ総額（¥）", value: `¥${totalSuperChatAmount.toLocaleString()}`, icon: Coins, color: "text-yellow-400", sub: "エールコイン換算" },
            { label: "総ユーザー数", value: totalUsers.toLocaleString(), icon: Users, color: "text-green-400", sub: "登録ユーザー" },
            { label: "クリエイター数", value: totalCreators.toLocaleString(), icon: Globe, color: "text-primary", sub: "チャンネル登録" },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <Card key={i} className="bg-card border-border/50 hover:border-primary/30 transition-all">
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground font-semibold">{kpi.label}</p>
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <p className="text-xl font-black">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground">{kpi.sub}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 収益KPI */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">💰 収益・購入</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "総購入数", value: totalPurchases.toLocaleString(), icon: TrendingUp, color: "text-yellow-400" },
          { label: "購入総額（¥）", value: `¥${totalPurchaseAmount.toLocaleString()}`, icon: TrendingUp, color: "text-amber-400" },
          { label: "ライブ配信収益（コイン）", value: totalLiveRevenue.toLocaleString(), icon: Coins, color: "text-red-400" },
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
      </div>

      {/* アクセス数グラフ */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Activity className="w-5 h-5 text-cyan-400" />
            日別動画視聴アクセス数（過去30日）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalPageViews === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">アクセスデータなし</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyViewData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#888" style={{ fontSize: "10px" }} tick={false} />
                <YAxis stroke="#888" style={{ fontSize: "12px" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #00d4ff" }} />
                <Bar dataKey="views" fill="#00d4ff" radius={4} name="視聴アクセス数" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* グラフ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 日別購入数 */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              日別購入数（過去30日）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalPurchases === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">購入データなし</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyPurchaseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#888" style={{ fontSize: "10px" }} tick={false} />
                  <YAxis stroke="#888" style={{ fontSize: "12px" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #00ff9d" }} />
                  <Bar dataKey="purchases" fill="#f59e0b" radius={4} name="購入数" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 日別ユーザー登録数 */}
        <Card className="bg-card border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Users className="w-5 h-5 text-primary" />
              日別ユーザー登録数（過去30日）
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalUsers === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-12">登録データなし</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyUserData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#888" style={{ fontSize: "10px" }} tick={false} />
                  <YAxis stroke="#888" style={{ fontSize: "12px" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #00ff9d" }} />
                  <Bar dataKey="registrations" fill="#00d4ff" radius={4} name="登録数" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* トップコンテンツ */}
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
                      <p className="text-[10px] text-muted-foreground">{video.channel_name}</p>
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

      {/* サマリー */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">📈 プラットフォーム総括</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <p><span className="font-semibold text-foreground">動画視聴アクセス数:</span>{" "}<span className="text-cyan-400 font-bold">{totalPageViews.toLocaleString()}</span></p>
          <p><span className="font-semibold text-foreground">総ビデオ再生数:</span>{" "}<span className="text-primary font-bold">{totalVideoViews.toLocaleString()}</span></p>
          <p><span className="font-semibold text-foreground">コメント総数:</span>{" "}<span className="text-purple-400 font-bold">{totalComments.toLocaleString()}</span></p>
          <p><span className="font-semibold text-foreground">ビデオ通話総数:</span>{" "}<span className="text-orange-400 font-bold">{totalVideoCalls.toLocaleString()}件（完了: {completedCalls}件）</span></p>
          <p><span className="font-semibold text-foreground">スパチャ総額:</span>{" "}<span className="text-yellow-400 font-bold">¥{totalSuperChatAmount.toLocaleString()}</span></p>
          <p><span className="font-semibold text-foreground">ライブ配信総収益（コイン）:</span>{" "}<span className="text-red-400 font-bold">{totalLiveRevenue.toLocaleString()}</span></p>
          <p><span className="font-semibold text-foreground">平均購入額:</span>{" "}<span className="text-primary font-bold">¥{totalPurchases > 0 ? Math.round(totalPurchaseAmount / totalPurchases).toLocaleString() : 0}</span></p>
          <p><span className="font-semibold text-foreground">ユーザーあたり平均購入数:</span>{" "}<span className="text-primary font-bold">{totalUsers > 0 ? (totalPurchases / totalUsers).toFixed(2) : 0}</span></p>
        </CardContent>
      </Card>
    </div>
  );
}