import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Phone, TrendingUp, TrendingDown, Coins, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

// 確定仕様: 150コイン/15分 / ライバー85% / Admin15%
const COINS_PER_15MIN    = 150;
const PLATFORM_RATE      = 0.15;   // Admin手数料15%（絶対確保）
const CREATOR_RATE       = 0.85;   // ライバー還元85%
const COIN_TO_YEN        = 1;      // 1コイン = 1円
const TURN_COST_PER_MIN  = 2;      // TURN fallback時の実費 ¥2/分
const P2P_SUCCESS_RATE   = 0.80;   // P2P成功率80% → 実効コスト ×0.20
// 期待インフラコスト: 15分 × ¥2 × 20% = ¥6/ユニット
// 運営収益: 150 × 15% = ¥22.5 → 純利益 ¥16.5/ユニット

function profitColor(val) {
  return val >= 0 ? "text-green-400" : "text-red-400";
}

function calcCallMetrics(call) {
  const consumedCoins    = call.coins_consumed || 0;
  const actualMin        = call.actual_duration_minutes || 0;

  // Admin15%を必ず確保（DBに保存済みの値を優先、なければ計算）
  const platformCoins    = call.platform_revenue_coins != null
    ? call.platform_revenue_coins
    : (consumedCoins - Math.floor(consumedCoins * CREATOR_RATE));
  const creatorCoins     = call.creator_revenue_coins != null
    ? call.creator_revenue_coins
    : Math.floor(consumedCoins * CREATOR_RATE);

  const platformRevYen   = platformCoins * COIN_TO_YEN;

  // インフラコスト（DBに保存済みを優先）
  const commCostYen      = call.comm_cost_yen != null
    ? call.comm_cost_yen
    : Math.round(actualMin * TURN_COST_PER_MIN * (1 - P2P_SUCCESS_RATE));

  // 純利益 = Admin収益(¥22.5) - インフラコスト(¥6期待値) = ¥16.5
  const profit           = call.platform_profit_yen != null
    ? call.platform_profit_yen
    : platformRevYen - commCostYen;

  return { consumedCoins, actualMin, platformCoins, creatorCoins, platformRevYen, commCostYen, profit };
}

function CallCostCard({ call }) {
  const { consumedCoins, actualMin, platformCoins, creatorCoins, platformRevYen, commCostYen, profit } = calcCallMetrics(call);

  return (
    <div className={`bg-card border rounded-2xl p-4 space-y-3 ${
      call.auto_disconnected ? "border-orange-500/40 bg-orange-500/5"
      : call.status === "active" ? "border-primary/40"
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
        <div className={`text-right shrink-0 px-3 py-2 rounded-xl ${profit >= 0 ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
          <p className="text-[10px] text-muted-foreground">運営純利益</p>
          <p className={`font-black text-lg ${profitColor(profit)}`}>
            {profit >= 0 ? "+" : ""}¥{profit.toFixed(1)}
          </p>
          {profit >= 0
            ? <TrendingUp className="w-4 h-4 text-green-400 ml-auto" />
            : <TrendingDown className="w-4 h-4 text-red-400 ml-auto" />
          }
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">15分単価</p>
          <p className="font-black text-base flex items-center justify-center gap-1">
            <Coins className="w-3.5 h-3.5 text-yellow-400" />{COINS_PER_15MIN}
          </p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">Admin収益(15%)</p>
          <p className="font-black text-base text-primary">¥{platformRevYen.toFixed(1)}</p>
          <p className="text-[9px] text-primary/60">{platformCoins}コイン</p>
        </div>
        <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">インフラコスト</p>
          <p className="font-black text-base text-orange-400">¥{commCostYen.toFixed(1)}</p>
          <p className="text-[9px] text-muted-foreground">TURN推定</p>
        </div>
        <div className="bg-secondary/60 rounded-xl p-2.5 text-center">
          <p className="text-muted-foreground mb-1">ライバー報酬(85%)</p>
          <p className="font-black text-base text-blue-400">{creatorCoins.toLocaleString()}枚</p>
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

  const activeCalls      = calls.filter(c => c.status === "active" && c.billing_started_at);
  const endedCalls       = calls.filter(c => c.status === "ended" && c.billing_started_at).slice(0, 20);
  const allBilled        = [...activeCalls, ...endedCalls];
  const autoDisconnected = calls.filter(c => c.auto_disconnected).length;

  // 集計（Admin15%確保ベース）
  const totalCoins        = allBilled.reduce((s, c) => s + (c.coins_consumed || 0), 0);
  const totalPlatformCoins = allBilled.reduce((s, c) => {
    const consumed = c.coins_consumed || 0;
    return s + (c.platform_revenue_coins != null ? c.platform_revenue_coins : (consumed - Math.floor(consumed * CREATOR_RATE)));
  }, 0);
  const totalPlatformYen  = totalPlatformCoins * COIN_TO_YEN;
  const totalCommCost     = allBilled.reduce((s, c) => {
    if (c.comm_cost_yen != null) return s + c.comm_cost_yen;
    const min = c.actual_duration_minutes || 0;
    return s + Math.round(min * TURN_COST_PER_MIN * (1 - P2P_SUCCESS_RATE));
  }, 0);
  const totalProfit       = totalPlatformYen - totalCommCost;

  return (
    <div className="space-y-6">
      {/* 方針バナー */}
      <div className="bg-secondary border border-border/30 rounded-xl px-4 py-3 text-xs space-y-2">
        <p className="font-bold text-foreground">📋 プラン別マトリックス（確定仕様）</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 space-y-0.5">
            <p className="font-bold text-orange-400">FREEプラン</p>
            <p className="text-muted-foreground">200コイン/15分 / ライバー<span className="text-green-400 font-bold">70%</span> / Admin<span className="text-orange-400 font-bold">30%（¥60）</span></p>
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-2 space-y-0.5">
            <p className="font-bold text-primary">Basicプラン</p>
            <p className="text-muted-foreground">150コイン/15分 / ライバー<span className="text-green-400 font-bold">85%</span> / Admin<span className="text-primary font-bold">15%（¥22.5）</span></p>
          </div>
        </div>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-green-400" />通話中</p>
          <p className="text-2xl font-black text-green-400">{activeCalls.length}</p>
        </div>
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Admin収益合計(15%)</p>
          <p className="text-2xl font-black text-primary">¥{totalPlatformYen.toFixed(0)}</p>
          <p className="text-xs text-primary/60">{totalPlatformCoins}コイン</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">インフラコスト推定</p>
          <p className="text-2xl font-black text-orange-400">¥{totalCommCost.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground">P2P{Math.round(P2P_SUCCESS_RATE*100)}%成功想定</p>
        </div>
        <div className={`rounded-xl p-4 border ${totalProfit >= 0 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <p className="text-xs text-muted-foreground">運営純利益</p>
          <p className={`text-2xl font-black ${profitColor(totalProfit)}`}>
            {totalProfit >= 0 ? "+" : ""}¥{totalProfit.toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground">流通: {totalCoins}コイン</p>
        </div>
      </div>

      {/* コスト定義メモ */}
      <div className="bg-secondary/40 border border-border/30 rounded-xl px-4 py-3 text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-3 gap-2">
        <p>💰 <strong className="text-foreground">Admin手数料</strong>: 15%（¥22.5/ユニット）</p>
        <p>📡 <strong className="text-foreground">TURN実費(推定)</strong>: ¥{TURN_COST_PER_MIN}/分 × {Math.round((1-P2P_SUCCESS_RATE)*100)}%通話 = ¥6/ユニット</p>
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