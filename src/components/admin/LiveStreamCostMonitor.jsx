import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Radio, TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, StopCircle } from "lucide-react";
import { format } from "date-fns";

// コスト定数（確定仕様）
const INPUT_COST_PER_HOUR = 30;          // 円/時間（場所代: AWS IVS入力）
const OUTPUT_COST_PER_VIEWER_HOUR = 5;   // 円/視聴者/時間（送料: AWS IVS出力）
const COIN_TO_YEN = 1;                   // 1コイン = 1円（決済手数料はユーザー側負担で別途加算）
const PLATFORM_FEE_RATE = 0.15;          // 運営手数料: 15%

function calcProfit(stream) {
  const inputCost = stream.cost_input_yen || 0;
  const outputCost = stream.cost_output_yen || 0;
  const totalCost = inputCost + outputCost;
  // 運営収益 = 消費コイン × 15% × 1円（確定仕様: 1コイン=1円）
  const revenueCoins = stream.revenue_coins || 0;
  const platformRevenue = revenueCoins * COIN_TO_YEN * PLATFORM_FEE_RATE;
  const profit = platformRevenue - totalCost;
  return { inputCost, outputCost, totalCost, platformRevenue, profit };
}

function StreamCostCard({ stream }) {
  const { inputCost, outputCost, totalCost, platformRevenue, profit } = calcProfit(stream);
  const isProfit = profit >= 0;

  // 配信時間計算
  const startedAt = stream.live_started_at ? new Date(stream.live_started_at) : new Date(stream.created_date);
  const endAt = stream.live_ended_at ? new Date(stream.live_ended_at) : new Date();
  const durationMin = Math.floor((endAt - startedAt) / 1000 / 60);

  return (
    <div className={`bg-card border rounded-2xl p-5 space-y-4 ${
      stream.auto_stopped
        ? "border-red-500/50 bg-red-500/5"
        : stream.status === "live"
        ? "border-primary/40"
        : "border-border/50"
    }`}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {stream.status === "live" ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full animate-pulse">
                <Radio className="w-3 h-3" /> LIVE
              </span>
            ) : (
              <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">ENDED</span>
            )}
            {stream.auto_stopped && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full">
                <StopCircle className="w-3 h-3" /> オートストップ
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{durationMin}分経過</span>
          </div>
          <p className="font-bold text-sm mt-1 truncate">{stream.title}</p>
          <p className="text-xs text-muted-foreground">{stream.channel_name}</p>
        </div>
        <div className={`text-right shrink-0 px-3 py-2 rounded-xl ${isProfit ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
          <p className="text-[10px] text-muted-foreground">運営純利益</p>
          <p className={`font-black text-lg ${isProfit ? "text-green-400" : "text-red-400"}`}>
            {isProfit ? "+" : ""}¥{profit.toFixed(1)}
          </p>
          {isProfit
            ? <TrendingUp className="w-4 h-4 text-green-400 ml-auto" />
            : <TrendingDown className="w-4 h-4 text-red-400 ml-auto" />
          }
        </div>
      </div>

      {/* KPI グリッド */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">視聴者数</p>
          <p className="font-black text-base flex items-center justify-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-400" />{stream.viewer_count || 0}
          </p>
        </div>
        <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">場所代（入力）</p>
          <p className="font-black text-base text-orange-400">¥{inputCost.toFixed(1)}</p>
        </div>
        <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">送料（出力）</p>
          <p className="font-black text-base text-orange-400">¥{outputCost.toFixed(1)}</p>
        </div>
        <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">運営収益（15%）</p>
          <p className="font-black text-base text-primary">¥{platformRevenue.toFixed(1)}</p>
        </div>
      </div>

      {/* 損益バー */}
      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>コスト合計: ¥{totalCost.toFixed(1)}</span>
          <span>運営収益: ¥{platformRevenue.toFixed(1)}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          {platformRevenue > 0 ? (
            <div
              className={`h-full rounded-full transition-all ${isProfit ? "bg-green-500" : "bg-red-500"}`}
              style={{ width: `${Math.min(100, (platformRevenue / Math.max(totalCost, 0.1)) * 100)}%` }}
            />
          ) : (
            <div className="h-full w-full bg-red-500/40 rounded-full" />
          )}
        </div>
      </div>

      {/* 視聴者0分警告 */}
      {stream.zero_viewer_since && stream.status === "live" && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          視聴者0人状態 — {Math.floor((new Date() - new Date(stream.zero_viewer_since)) / 60000)}分経過
          （5分でオートストップ）
        </div>
      )}

      {stream.live_started_at && (
        <p className="text-[10px] text-muted-foreground">
          開始: {format(new Date(stream.live_started_at), "MM/dd HH:mm")}
          {stream.live_ended_at && ` → 終了: ${format(new Date(stream.live_ended_at), "HH:mm")}`}
        </p>
      )}
    </div>
  );
}

export default function LiveStreamCostMonitor() {
  const { data: liveStreams = [], isLoading } = useQuery({
    queryKey: ["admin-live-cost-monitor"],
    queryFn: () => base44.entities.LiveStream.list("-created_date", 50),
    refetchInterval: 30000,
  });

  const activeStreams = liveStreams.filter(s => s.status === "live");
  const recentEnded = liveStreams.filter(s => s.status === "ended" && s.live_started_at).slice(0, 10);

  // 合計コスト・利益
  const allStreams = [...activeStreams, ...recentEnded];
  const totalInputCost = allStreams.reduce((s, st) => s + (st.cost_input_yen || 0), 0);
  const totalOutputCost = allStreams.reduce((s, st) => s + (st.cost_output_yen || 0), 0);
  const totalRevCoins = allStreams.reduce((s, st) => s + (st.revenue_coins || 0), 0);
  const totalPlatformRev = totalRevCoins * COIN_TO_YEN * PLATFORM_FEE_RATE;
  const totalProfit = totalPlatformRev - totalInputCost - totalOutputCost;

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Radio className="w-3.5 h-3.5 text-red-400" />ライブ中</p>
          <p className="text-2xl font-black text-red-400">{activeStreams.length}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground">場所代+送料</p>
          <p className="text-2xl font-black text-orange-400">¥{(totalInputCost + totalOutputCost).toFixed(0)}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 space-y-1">
          <p className="text-xs text-muted-foreground">運営収益（15%）</p>
          <p className="text-2xl font-black text-primary">¥{totalPlatformRev.toFixed(0)}</p>
        </div>
        <div className={`rounded-xl p-4 space-y-1 border ${totalProfit >= 0 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <p className="text-xs text-muted-foreground">運営純利益</p>
          <p className={`text-2xl font-black ${totalProfit >= 0 ? "text-green-400" : "text-red-400"}`}>
            {totalProfit >= 0 ? "+" : ""}¥{totalProfit.toFixed(0)}
          </p>
        </div>
      </div>

      {/* コスト定義メモ */}
      <div className="bg-secondary/40 border border-border/30 rounded-xl px-4 py-3 text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-3 gap-2">
        <p>📍 <strong className="text-foreground">場所代</strong>: ¥{INPUT_COST_PER_HOUR}/時間（HD入力コスト）</p>
        <p>📦 <strong className="text-foreground">送料</strong>: ¥{OUTPUT_COST_PER_VIEWER_HOUR}/視聴者/時間（出力コスト）</p>
        <p>⛔ <strong className="text-foreground">オートストップ</strong>: 視聴者0人が5分継続で強制終了</p>
      </div>

      {/* ライブ中 */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">読み込み中...</div>
      ) : activeStreams.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-bold text-red-400 flex items-center gap-2">
            <Radio className="w-4 h-4 animate-pulse" /> ライブ中の配信
          </p>
          {activeStreams.map(s => <StreamCostCard key={s.id} stream={s} />)}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
          現在ライブ中の配信はありません
        </div>
      )}

      {/* 直近終了 */}
      {recentEnded.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-muted-foreground">直近の終了配信（コスト記録あり）</p>
          {recentEnded.map(s => <StreamCostCard key={s.id} stream={s} />)}
        </div>
      )}
    </div>
  );
}