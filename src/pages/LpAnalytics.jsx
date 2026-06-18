import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Users, Eye, ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MetaHelmet from "@/components/layout/MetaHelmet";

// 主要LP定義
const LP_DEFINITIONS = [
  { key: "fortune_telling", path: "/fortune-lp",   label: "占い師・鑑定士",        emoji: "🔮", color: "#a78bfa" },
  { key: "education",       path: "/lp/tutor",      label: "講師・家庭教師",        emoji: "📚", color: "#60a5fa" },
  { key: "other_musician",  path: "/musician",      label: "音楽家・アーティスト",  emoji: "🎵", color: "#fbbf24" },
  { key: "idol",            path: "/idol-lp",       label: "アイドル・ファン活動",  emoji: "✨", color: "#f472b6" },
  { key: "classroom",       path: "/classroom-lp",  label: "オンライン教室",        emoji: "🏫", color: "#34d399" },
  { key: "other",           path: "/recruit",       label: "その他のクリエイター",  emoji: "🌱", color: "#94a3b8" },
];

// service_category → LP key マッピング
const CAT_TO_LP = {
  fortune_telling: "fortune_telling",
  idol:            "idol",
  language:        "education",
  fitness:         "other",
  business:        "other",
  education:       "education",
  other:           "other",
};

export default function LpAnalytics() {
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

  // チャンネル全件取得（service_category で分類）
  const { data: channels = [], isLoading: chLoading } = useQuery({
    queryKey: ["lp-analytics-channels"],
    queryFn: () => base44.entities.Channel.list("-created_date", 500),
    enabled: !!user,
    refetchInterval: 60000,
  });

  // PlanSubscription（登録転換の代理指標）
  const { data: plans = [], isLoading: planLoading } = useQuery({
    queryKey: ["lp-analytics-plans"],
    queryFn: () => base44.entities.PlanSubscription.list("-created_date", 500),
    enabled: !!user,
    refetchInterval: 60000,
  });

  // チャンネルを期間でフィルタする関数
  const getChannelsByPeriod = (days) => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return channels.filter((c) => new Date(c.created_date) >= since);
  };

  // LP別チャンネル登録数を集計
  const buildLpStats = (chs) => {
    const counts = {};
    LP_DEFINITIONS.forEach((lp) => (counts[lp.key] = 0));

    chs.forEach((ch) => {
      const cat = ch.service_category || "other";
      // 音楽家は stream_category で判定
      if (ch.stream_category === "all" && cat === "other") {
        counts["other_musician"] = (counts["other_musician"] || 0) + 1;
      } else {
        const lpKey = CAT_TO_LP[cat] || "other";
        counts[lpKey] = (counts[lpKey] || 0) + 1;
      }
    });

    return LP_DEFINITIONS.map((lp) => ({
      ...lp,
      registrations: counts[lp.key] || 0,
    }));
  };

  const [period, setPeriod] = useState(30);
  const periodChannels = getChannelsByPeriod(period);
  const lpStats = buildLpStats(periodChannels);
  const totalRegistrations = lpStats.reduce((s, l) => s + l.registrations, 0);

  // 有料転換（PlanSubscription）をチャンネルのservice_categoryで近似
  const paidChannelEmails = new Set(plans.map((p) => p.user_email));
  const paidStats = buildLpStats(
    periodChannels.filter((c) => paidChannelEmails.has(c.owner_email))
  );

  // 全期間累計
  const allTimeStats = buildLpStats(channels);

  if (!user || user.role !== "admin") return null;

  const isLoading = chLoading || planLoading;

  return (
    <div className="min-h-screen bg-background pt-4 pb-24 sm:p-6 space-y-8 max-w-5xl mx-auto">
      <MetaHelmet page="admin" noindex={true} />

      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary shrink-0" />
            LPカテゴリ別レポート
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            各LPからのクリエイター登録数・プラン転換の概況
          </p>
        </div>
        <Link to="/admin/metrics">
          <Button variant="outline" size="sm">メトリクスに戻る</Button>
        </Link>
      </div>

      {/* 注記バナー */}
      <div className="mx-4 sm:mx-0 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-xs text-amber-300 leading-relaxed">
        <strong>ℹ️ データの読み方：</strong>
        「チャンネル登録数」は各LPが対象とするカテゴリ（service_category）で作成されたチャンネル数です。
        LP直接のページビュートラッキングは今後追加予定です。「プラン加入数」はそのクリエイターが有料プランに加入した件数の近似値です。
      </div>

      {/* 期間フィルター */}
      <div className="flex gap-2 flex-wrap px-4 sm:px-0">
        {[
          { label: "直近7日", days: 7 },
          { label: "直近30日", days: 30 },
          { label: "直近90日", days: 90 },
        ].map(({ label, days }) => (
          <button
            key={days}
            onClick={() => setPeriod(days)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
              period === days
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPIサマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 sm:px-0">
        {[
          { icon: Users, label: `チャンネル登録（${period}日間）`, value: totalRegistrations },
          { icon: TrendingUp, label: "全期間累計チャンネル", value: channels.length },
          { icon: Eye, label: "有料プラン加入（累計）", value: plans.length },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-card rounded-xl border border-border/50 p-4 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="w-4 h-4" />
                <span className="text-xs">{kpi.label}</span>
              </div>
              <p className="text-2xl font-black">
                {isLoading ? <span className="text-sm text-muted-foreground">読込中…</span> : kpi.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* メインチャート */}
      <div className="bg-card rounded-xl border border-border/50 p-5 mx-4 sm:mx-0 space-y-4">
        <h2 className="font-bold text-sm">LP別チャンネル登録数（直近{period}日）</h2>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">読込中…</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={lpStats} margin={{ top: 4, right: 4, left: -20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                angle={-30}
                textAnchor="end"
                interval={0}
                height={70}
              />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                formatter={(v, n) => [`${v} 件`, "チャンネル登録"]}
              />
              <Bar dataKey="registrations" radius={[4, 4, 0, 0]}>
                {lpStats.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* LP別テーブル */}
      <div className="bg-card rounded-xl border border-border/50 mx-4 sm:mx-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="font-bold text-sm">LP別詳細（直近{period}日 vs 全期間）</h2>
        </div>
        <div className="divide-y divide-border/30">
          {lpStats.map((lp) => {
            const allTime = allTimeStats.find((l) => l.key === lp.key);
            const paid = paidStats.find((l) => l.key === lp.key);
            const convRate = lp.registrations > 0
              ? ((paid?.registrations || 0) / lp.registrations * 100).toFixed(1)
              : "—";
            return (
              <div key={lp.key} className="flex items-center gap-3 px-5 py-3.5">
                <span className="text-xl shrink-0">{lp.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{lp.label}</p>
                  <p className="text-xs text-muted-foreground">{lp.path}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className="text-sm font-black" style={{ color: lp.color }}>{lp.registrations} 件</p>
                  <p className="text-[10px] text-muted-foreground">累計 {allTime?.registrations || 0} 件</p>
                </div>
                <div className="text-right shrink-0 w-16">
                  <p className="text-xs font-bold text-primary">{convRate}{convRate !== "—" ? "%" : ""}</p>
                  <p className="text-[10px] text-muted-foreground">有料転換</p>
                </div>
                <Link to={lp.path} target="_blank">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* 今後の施策メモ */}
      <div className="bg-card rounded-xl border border-border/50 p-5 mx-4 sm:mx-0 space-y-3">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-primary" />
          次のステップ（ページビュートラッキング追加）
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          各LPのコンポーネントに <code className="bg-secondary px-1 py-0.5 rounded">base44.analytics.track("lp_view", &#123; lp: "fortune-lp" &#125;)</code> を追加することで、
          実際のページビュー数と登録転換率を正確に計測できます。現在の表示はチャンネル登録カテゴリによる近似値です。
        </p>
      </div>
    </div>
  );
}