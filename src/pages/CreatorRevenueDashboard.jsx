import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";
import { Crown, TrendingUp, Users, Gift, Coins, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

function StatCard({ icon: Icon, label, value, sub, color = "primary" }) {
  const colorMap = {
    primary: "text-primary bg-primary/10",
    yellow: "text-yellow-400 bg-yellow-400/10",
    blue: "text-blue-400 bg-blue-400/10",
    pink: "text-pink-400 bg-pink-400/10",
  };
  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-2xl font-black mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border/50 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.name.includes("収益") || p.name.includes("¥") ? `¥${Number(p.value).toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function CreatorRevenueDashboard() {
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) { base44.auth.redirectToLogin(); return; }
      base44.auth.me().then(async (u) => {
        setUser(u);
        const chs = await base44.entities.Channel.filter({ owner_email: u.email });
        if (chs[0]) setChannel(chs[0]);
      });
    });
  }, []);

  const { data: purchases = [] } = useQuery({
    queryKey: ["dash-purchases", channel?.id],
    queryFn: () => base44.entities.Purchase.filter({ channel_id: channel.id }, "-created_date", 200),
    enabled: !!channel?.id,
  });

  const { data: superChats = [] } = useQuery({
    queryKey: ["dash-superchats", channel?.id],
    queryFn: () => base44.entities.SuperChat.filter({ channel_id: channel.id }, "-created_date", 200),
    enabled: !!channel?.id,
  });

  const { data: fanclubSubs = [] } = useQuery({
    queryKey: ["dash-fanclub-subs", channel?.id],
    queryFn: () => base44.entities.PlanSubscription.filter({ plan_id: `fanclub_${channel.id}`, status: "active" }),
    enabled: !!channel?.id,
  });

  const { data: calls = [] } = useQuery({
    queryKey: ["dash-calls", user?.email],
    queryFn: () => base44.entities.VideoCall.filter({ callee_email: user.email, status: "ended" }, "-created_date", 100),
    enabled: !!user?.email,
  });

  // 時間帯別収益トレンド（過去30日・日次）
  const dailyRevenue = useMemo(() => {
    const map = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      map[key] = { date: key, 動画収益: 0, 通話収益: 0, 投げ銭: 0 };
    }
    purchases.forEach((p) => {
      const d = new Date(p.created_date);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (map[key]) map[key].動画収益 += Math.floor((p.amount || 0) * 0.85);
    });
    calls.forEach((c) => {
      const d = new Date(c.created_date);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (map[key]) map[key].通話収益 += Math.floor((c.price || 0) * 0.70);
    });
    superChats.forEach((s) => {
      const d = new Date(s.created_date);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (map[key]) map[key].投げ銭 += s.amount || 0;
    });
    return Object.values(map);
  }, [purchases, calls, superChats]);

  // 時間帯別（0〜23時）
  const hourlyRevenue = useMemo(() => {
    const map = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}時`, 収益: 0 }));
    [...purchases, ...superChats].forEach((p) => {
      const h = new Date(p.created_date).getHours();
      map[h].収益 += p.amount || 0;
    });
    return map;
  }, [purchases, superChats]);

  // 投げ銭ランキング
  const tippingRanking = useMemo(() => {
    const map = {};
    superChats.forEach((s) => {
      const key = s.user_name || s.user_email || "匿名";
      map[key] = (map[key] || 0) + (s.amount || 0);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, amount], i) => ({ rank: i + 1, name, amount }));
  }, [superChats]);

  // 収益内訳（円グラフ用）
  const revenueBreakdown = useMemo(() => {
    const videoRev = purchases.reduce((s, p) => s + Math.floor((p.amount || 0) * 0.85), 0);
    const callRev = calls.reduce((s, c) => s + Math.floor((c.price || 0) * 0.70), 0);
    const tipRev = superChats.reduce((s, sc) => s + (sc.amount || 0), 0);
    return [
      { name: "動画販売", value: videoRev },
      { name: "通話収益", value: callRev },
      { name: "投げ銭", value: tipRev },
      { name: "ファンクラブ", value: fanclubSubs.length * (channel?.fanclub_monthly_price || 0) * 0.85 },
    ].filter((x) => x.value > 0);
  }, [purchases, calls, superChats, fanclubSubs, channel]);

  const totalRevenue = revenueBreakdown.reduce((s, r) => s + r.value, 0);
  const totalTips = superChats.reduce((s, sc) => s + (sc.amount || 0), 0);

  if (!user || !channel) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/creator-dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black">収益ダッシュボード</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{channel.name}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="累計収益（手取り）" value={`¥${totalRevenue.toLocaleString()}`} sub="プラットフォーム手数料控除後" color="primary" />
        <StatCard icon={Crown} label="ファンクラブ会員数" value={`${fanclubSubs.length}人`} sub={`月額 ¥${(channel.fanclub_monthly_price || 0).toLocaleString()}`} color="yellow" />
        <StatCard icon={Gift} label="累計投げ銭" value={`¥${totalTips.toLocaleString()}`} sub={`${superChats.length}件`} color="pink" />
        <StatCard icon={Users} label="総販売件数" value={`${purchases.length}件`} sub={`通話 ${calls.length}件含む`} color="blue" />
      </div>

      {/* 日次収益トレンド */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <h2 className="font-bold">過去30日間の収益トレンド</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dailyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gVideo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gCall" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gTip" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `¥${v}`} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="動画収益" stroke="#10b981" fill="url(#gVideo)" strokeWidth={2} />
            <Area type="monotone" dataKey="通話収益" stroke="#3b82f6" fill="url(#gCall)" strokeWidth={2} />
            <Area type="monotone" dataKey="投げ銭" stroke="#f59e0b" fill="url(#gTip)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 時間帯別収益 */}
        <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
          <h2 className="font-bold">時間帯別収益分布</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyRevenue} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={2} />
              <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `¥${v}`} width={50} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="収益" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 収益内訳 */}
        <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
          <h2 className="font-bold">収益内訳</h2>
          {revenueBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={revenueBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {revenueBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
              まだ収益データがありません
            </div>
          )}
        </div>
      </div>

      {/* 投げ銭ランキング */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-yellow-400" />
          <h2 className="font-bold">投げ銭ランキング TOP10</h2>
        </div>
        {tippingRanking.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">まだ投げ銭がありません</p>
        ) : (
          <div className="space-y-2">
            {tippingRanking.map(({ rank, name, amount }) => {
              const max = tippingRanking[0].amount;
              const pct = Math.round((amount / max) * 100);
              const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
              return (
                <div key={rank} className="flex items-center gap-3">
                  <span className="w-8 text-center text-sm font-bold shrink-0">{medal}</span>
                  <span className="text-sm font-medium w-36 truncate shrink-0">{name}</span>
                  <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-bold text-yellow-400 shrink-0 w-24 text-right">¥{amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}