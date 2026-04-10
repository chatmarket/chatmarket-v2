import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, TrendingUp, Wallet, Radio, Video, Phone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import EarningsSummaryCard from "../components/dashboard/EarningsSummaryCard";
import UnpaidBalanceCard from "../components/dashboard/UnpaidBalanceCard";
import RecentActivityList from "../components/dashboard/RecentActivityList";
import RevenueChart from "../components/dashboard/RevenueChart";
import ViewerChart from "../components/dashboard/ViewerChart";
import FanClubStatus from "../components/dashboard/FanClubStatus";
import NotificationSidebar from "../components/dashboard/NotificationSidebar";

export default function CreatorDashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channel } = useQuery({
    queryKey: ["my-channel-dashboard", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then((r) => r[0]),
    enabled: !!user,
  });

  // 当月の開始・終了
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: liveStreams = [] } = useQuery({
    queryKey: ["dashboard-livestreams", user?.email],
    queryFn: () => base44.entities.LiveStream.filter({ channel_id: channel.id }, "-created_date", 10),
    enabled: !!channel,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["dashboard-videos", user?.email],
    queryFn: () => base44.entities.Video.filter({ channel_id: channel.id }, "-created_date", 10),
    enabled: !!channel,
  });

  const { data: superChats = [] } = useQuery({
    queryKey: ["dashboard-superchats", user?.email],
    queryFn: () => base44.entities.SuperChat.filter({ callee_email: user.email }, "-created_date", 50),
    enabled: !!user,
  });

  const { data: videoCalls = [] } = useQuery({
    queryKey: ["dashboard-videocalls", user?.email],
    queryFn: () => base44.entities.VideoCall.filter({ callee_email: user.email, status: "ended" }, "-created_date", 50),
    enabled: !!user,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["dashboard-purchases", channel?.id],
    queryFn: () => base44.entities.Purchase.filter({ channel_id: channel.id, status: "completed" }, "-created_date", 50),
    enabled: !!channel,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ["dashboard-followers", channel?.id],
    queryFn: () => base44.entities.ChannelFollow.filter({ channel_id: channel.id }),
    enabled: !!channel,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["dashboard-subscriptions", user?.email],
    queryFn: () => base44.entities.PlanSubscription.filter({ plan_id: "fanclub" }),
    enabled: !!user,
  });

  // 当月フィルタ
  const thisMonthFilter = (item) => {
    const d = item.created_date;
    return d >= monthStart && d <= monthEnd;
  };

  const monthSuperChats = superChats.filter(thisMonthFilter);
  const monthVideoCalls = videoCalls.filter(thisMonthFilter);
  const monthPurchases = purchases.filter(thisMonthFilter);

  // 収益計算（プラットフォーム手数料後）
  const superChatRevenue = monthSuperChats.reduce((s, c) => s + (c.amount || 0) * 0.9, 0);
  const videoCallRevenue = monthVideoCalls.reduce((s, c) => s + (c.price || 0) * 0.85, 0);
  const purchaseRevenue = monthPurchases.reduce((s, c) => s + (c.amount || 0) * 0.85, 0);
  const totalRevenue = superChatRevenue + videoCallRevenue + purchaseRevenue;

  // 未払い残高（過去全期間の累計 - 簡易計算）
  const allSuperChatRevenue = superChats.reduce((s, c) => s + (c.amount || 0) * 0.9, 0);
  const allVideoCallRevenue = videoCalls.reduce((s, c) => s + (c.price || 0) * 0.85, 0);
  const allPurchaseRevenue = purchases.reduce((s, c) => s + (c.amount || 0) * 0.85, 0);
  const unpaidBalance = allSuperChatRevenue + allVideoCallRevenue + allPurchaseRevenue;

  // 直近アクティビティ（配信・通話・購入を統合して時系列）
  const recentActivities = [
    ...liveStreams.slice(0, 5).map((s) => ({ type: "live", item: s, date: s.created_date })),
    ...videoCalls.slice(0, 5).map((c) => ({ type: "call", item: c, date: c.created_date })),
    ...purchases.slice(0, 5).map((p) => ({ type: "purchase", item: p, date: p.created_date })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            配信者ダッシュボード
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {channel?.name || user.full_name} の活動サマリー
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/analytics">
            <Button variant="outline" size="sm" className="gap-2">
              <TrendingUp className="w-4 h-4" /> 詳細分析
            </Button>
          </Link>
          <Link to="/revenue">
            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
              <Wallet className="w-4 h-4" /> 収益管理
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインコンテンツ（左2/3） */}
        <div className="lg:col-span-2 space-y-6">
          {/* 当月売上サマリー */}
          <EarningsSummaryCard
            totalRevenue={totalRevenue}
            superChatRevenue={superChatRevenue}
            videoCallRevenue={videoCallRevenue}
            purchaseRevenue={purchaseRevenue}
            monthSuperChats={monthSuperChats.length}
            monthVideoCalls={monthVideoCalls.length}
            monthPurchases={monthPurchases.length}
          />

          {/* 過去30日間の収益グラフ */}
          <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              過去30日間の収益推移
            </h3>
            <RevenueChart purchases={purchases} superChats={superChats} videoCalls={videoCalls} />
          </div>

          {/* 視聴者数推移グラフ */}
          <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              過去30日間の視聴者数推移
            </h3>
            <ViewerChart liveStreams={liveStreams} videos={videos} />
          </div>

          {/* ファンクラブ状況 */}
          <div className="bg-card border border-border/50 rounded-xl p-5">
            <FanClubStatus followers={followers} subscriptions={subscriptions} />
          </div>

          {/* 未払い残高 */}
          <UnpaidBalanceCard unpaidBalance={unpaidBalance} />

          {/* クイックアクション */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "ライブ配信", icon: Radio, to: "/go-live", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
              { label: "動画アップ", icon: Video, to: "/upload", color: "text-primary", bg: "bg-primary/10 border-primary/30" },
              { label: "通話枠設定", icon: Phone, to: "/call-slots", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
              { label: "チャンネル管理", icon: RefreshCw, to: "/my-channel", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
            ].map(({ label, icon: Icon, to, color, bg }) => (
              <Link key={to} to={to}>
                <div className={`border rounded-xl p-4 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer ${bg}`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                  <span className="text-xs font-semibold">{label}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* 直近アクティビティ */}
          <RecentActivityList activities={recentActivities} />
        </div>

        {/* サイドバー（右1/3）通知 */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border/50 rounded-xl p-4 sticky top-20">
            <NotificationSidebar activities={recentActivities} />
          </div>
        </div>
      </div>
    </div>
  );
}