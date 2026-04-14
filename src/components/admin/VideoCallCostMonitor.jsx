import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Phone, TrendingUp, TrendingDown, Coins, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const COMM_COST_PER_MIN = 4;          // AWS通信実費: ¥4/分（双方向）
const COIN_TO_YEN = 1;                // 1コイン = 1円（確定仕様）
const PLATFORM_FEE_RATE = 0.15;       // 運営手数料: 15%

function profitColor(val) {
  return val >= 0 ? "text-green-400" : "text-red-400";
}

function CallCostCard({ call }) {
  const isProfit = (call.platform_profit_yen || 0) >= 0;
  const actualMin = call.actual_duration_minutes || 0;
  const consumedCoins = call.coins_consumed || 0;
  const platformRev = call.platform_revenue_coins || Math.floor(consumedCoins * PLATFORM_FEE_RATE);
  const platformRevYen = platformRev * COIN_TO_YEN;
  const commCost = call.comm_cost_yen || (actualMin * COMM_COST_PER_MIN);
  const profit = call.platform_profit_yen !== undefined ? call.platform_profit_yen : (platformRevYen - commCost);

  return (
    <div className={`bg-card border rounded-2xl p-4 space-y-3 ${
      call.auto_disconnected
        ? "border-orange-500/40 bg-orange-500/5"
        : call.status === "active"
        ? "border-primary/40"
        : "border-border/50"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {call.status === "active" ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full animate-pulse">
                <Phone className="w-3 h-3" /> 通話中
              </span>
            ) : (
              <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">終了</span>
            )}
            {call.auto_disconnected && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> 残高不足切断
              </span>
            )}
          </div>
          <p className="font-bold text-sm mt-1 truncate">{call.caller_name} → {call.callee_name}</p>
          <p className="text-xs text-muted-foreground">{actualMin}分通話 / {consumedCoins.toLocaleString()}コイン消費</p>
        </div>
        <div className={`text-right shrink-0 px-3 py-2 rounded-xl ${isProfit ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
          <p className="text-[10px] text-muted-foreground">運営純利益</p>
          <p className={`font-black text-lg ${profitColor(profit)}`}>
            {profit >= 0 ? "+" : ""}¥{profit.toFixed(1)}
          </p>
          {isProfit
            ? <TrendingUp className="w-4 h-4 text-green-400 ml-auto" />
            : <TrendingDown className="w-4 h-4 text-red-400 ml-auto" />
          }
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">15分単価</p>
          <p className="font-black text-base flex items-center justify-center gap-1">
            <Coins className="w-3.5 h-3.5 text-yellow-400" />{(call.coin_price_per_15min || 500).toLocaleString()}
          </p>
        </div>
        <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">通信実費</p>
          <p className="font-black text-base text-orange-400">¥{commCost.toFixed(1)}</p>
        </div>
        <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">運営収益(15%)</p>
          <p className="font-black text-base text-primary">¥{platformRevYen.toFixed(1)}</p>
        </div>
        <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">ライバー報酬(85%)</p>
          <p className="font-black text-base text-blue-400">{(call.creator_revenue_coins || Math.floor(consumedCoins * 0.85)).toLocaleString()}枚</p>
        </div>
      </div>

      {call.billing_started_at && (
        <p className="text-[10px] text-muted-foreground">
          課金開始: {format(new Date(call.billing_started_at), "MM/dd HH:mm")}
          {call.status === "ended" && actualMin > 0 && ` • 実通話: ${actualMin}分`}
        </p>
      )}
    </div>
  );
}

export default function VideoCallCostMonitor() {
  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["admin-videocall-cost"],
    queryFn: () => base44.entities.VideoCall.list("-created_date", 50),
    refetchInterval: 15000,
  });

  const activeCalls = calls.filter(c => c.status === "active" && c.billing_started_at);
  const endedCalls = calls.filter(c => c.status === "ended" && c.billing_started_at).slice(0, 20);

  // 合計集計
  const allBilled = [...activeCalls, ...endedCalls];
  const totalCoins = allBilled.reduce((s, c) => s + (c.coins_consumed || 0), 0);
  const totalCommCost = allBilled.reduce((s, c) => s + (c.comm_cost_yen || 0), 0);
  const totalPlatformRev = allBilled.reduce((s, c) => s + ((c.platform_revenue_coins || Math.floor((c.coins_consumed || 0) * PLATFORM_FEE_RATE)) * COIN_TO_YEN), 0);
  const totalProfit = totalPlatformRev - totalCommCost;
  const autoDisconnected = calls.filter(c => c.auto_disconnected).length;

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-green-400" />通話中</p>
          <p className="text-2xl font-black text-green-400">{activeCalls.length}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">通信実費合計</p>
          <p className="text-2xl font-black text-orange-400">¥{totalCommCost.toFixed(0)}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">運営収益(15%)</p>
          <p className="text-2xl font-black text-primary">¥{totalPlatformRev.toFixed(0)}</p>
        </div>
        <div className={`rounded-xl p-4 border ${totalProfit >= 0 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <p className="text-xs text-muted-foreground">運営純利益</p>
          <p className={`text-2xl font-black ${profitColor(totalProfit)}`}>
            {totalProfit >= 0 ? "+" : ""}¥{totalProfit.toFixed(0)}
          </p>
        </div>
      </div>

      {/* コスト定義 */}
      <div className="bg-secondary/40 border border-border/30 rounded-xl px-4 py-3 text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-4 gap-2">
        <p>📞 <strong className="text-foreground">最低料金</strong>: 500コイン/15分</p>
        <p>📡 <strong className="text-foreground">Chime通信費</strong>: ¥{COMM_COST_PER_MIN}/分（双方向）</p>
        <p>🎬 <strong className="text-foreground">録画費</strong>: ¥2/分</p>
        {autoDisconnected > 0 && (
          <p className="text-orange-400">⚠️ <strong>残高不足切断</strong>: {autoDisconnected}件</p>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm animate-pulse">読み込み中...</div>
      ) : activeCalls.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-bold text-green-400 flex items-center gap-2">
            <Phone className="w-4 h-4 animate-pulse" /> 通話中のセッション
          </p>
          {activeCalls.map(c => <CallCostCard key={c.id} call={c} />)}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Phone className="w-8 h-8 mx-auto mb-2 opacity-30" />
          現在通話中のセッションはありません
        </div>
      )}

      {endedCalls.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-muted-foreground">直近の終了セッション</p>
          {endedCalls.map(c => <CallCostCard key={c.id} call={c} />)}
        </div>
      )}
    </div>
  );
}