import React, { useMemo } from "react";
import { Phone, TrendingDown, TrendingUp, AlertTriangle, Info } from "lucide-react";

/**
 * AWS Chime SDK移行後の正確な収支パネル
 *
 * ── 前提（確定仕様） ───────────────────────────────────────────────
 *   課金単位         : 15分 / 150コイン（1コイン=1円）
 *   Stripe手数料     : リスナー負担・外乗せ方式（3.6% + 40円）
 *     → リスナー実支払額 = ceil((150 + 40) / (1 - 0.036)) = 197円
 *     → Stripeへ        = 197 - 150 = 47円（プラットフォーム持ち出し0円）
 *   AWS Chime通信費  : 4円/分 × 15分 = 60円/ユニット（双方向）
 *   クリエイター配分 : 150円 × 85% = 127.5円 → floor = 127円
 *   運営取り分       : 150円 × 15% = 22.5円 → floor = 22円
 *   運営純利益       : 22円 - 60円 = ▲38円/ユニット（赤字）
 * ──────────────────────────────────────────────────────────────────
 */

// ── 定数 ──────────────────────────────────────────────────────────
const COIN_PER_UNIT       = 150;   // 15分あたりコイン
const STRIPE_RATE         = 0.036;
const STRIPE_FIXED        = 40;    // 円
const CHIME_COST_PER_MIN  = 4;     // 円/分
const UNIT_MINUTES        = 15;
const CREATOR_SHARE       = 0.85;

// リスナーが実際に支払う金額（外乗せ）
const listenerCharge = Math.ceil((COIN_PER_UNIT + STRIPE_FIXED) / (1 - STRIPE_RATE)); // 197円
// プラットフォームが受け取るコイン（Stripe手数料はリスナー負担なので150円がそのまま入る）
const platformReceive     = COIN_PER_UNIT;                                             // 150円
// AWS Chime通信費 / ユニット
const chimeCostPerUnit    = CHIME_COST_PER_MIN * UNIT_MINUTES;                        // 60円
// クリエイター配分
const creatorPayout       = Math.floor(COIN_PER_UNIT * CREATOR_SHARE);               // 127円
// 運営取り分（手数料15%）
const platformFee         = COIN_PER_UNIT - creatorPayout;                            // 23円
// 運営純利益
const unitProfit          = platformFee - chimeCostPerUnit;                           // ▲37円

export default function CallProfitBreakdown({ calls = [] }) {
  const stats = useMemo(() => {
    const endedCalls = calls.filter(c => c.status === "ended" && (c.coins_consumed || 0) > 0);
    const totalUnits = endedCalls.reduce((sum, c) => {
      const units = Math.ceil((c.actual_duration_minutes || 15) / UNIT_MINUTES);
      return sum + units;
    }, 0);
    const totalCoins         = endedCalls.reduce((sum, c) => sum + (c.coins_consumed || 0), 0);
    const totalListenerPaid  = endedCalls.reduce((sum, c) => {
      const units = Math.ceil((c.actual_duration_minutes || 15) / UNIT_MINUTES);
      return sum + units * listenerCharge;
    }, 0);
    const totalChimeCost     = totalUnits * chimeCostPerUnit;
    const totalCreatorPayout = Math.floor(totalCoins * CREATOR_SHARE);
    const totalPlatformFee   = totalCoins - totalCreatorPayout;
    const totalProfit        = totalPlatformFee - totalChimeCost;
    return {
      callCount: endedCalls.length,
      totalUnits,
      totalCoins,
      totalListenerPaid,
      totalChimeCost,
      totalCreatorPayout,
      totalPlatformFee,
      totalProfit,
    };
  }, [calls]);

  return (
    <div className="bg-card rounded-xl border border-border/50 p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-cyan-400" />
        <h3 className="font-bold text-base">ビデオ通話 収支内訳（AWS Chime SDK）</h3>
        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">Stripe手数料リスナー負担</span>
      </div>

      {/* 1ユニットあたりの収支 */}
      <div className="bg-secondary/60 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">1ユニット（15分）あたりの収支</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <UnitCell
            label="リスナー支払額"
            value={`¥${listenerCharge}`}
            sub="Stripe外乗せ後"
            color="text-blue-400"
          />
          <UnitCell
            label="PF受取（コイン）"
            value={`¥${platformReceive}`}
            sub="Stripe手数料込み"
            color="text-white"
          />
          <UnitCell
            label="Chime通信費"
            value={`▲¥${chimeCostPerUnit}`}
            sub={`¥${CHIME_COST_PER_MIN}/分 × ${UNIT_MINUTES}分`}
            color="text-orange-400"
          />
          <UnitCell
            label="クリエイター配分"
            value={`¥${creatorPayout}`}
            sub="85%"
            color="text-green-400"
          />
        </div>

        <div className="border-t border-border/40 pt-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            運営純利益／ユニット
            <span className="ml-2 text-xs">（PF受取 ¥{platformFee} − Chime ¥{chimeCostPerUnit}）</span>
          </div>
          <div className={`text-xl font-black flex items-center gap-1 ${unitProfit >= 0 ? "text-primary" : "text-red-400"}`}>
            {unitProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {unitProfit >= 0 ? "+" : ""}¥{unitProfit}
          </div>
        </div>

        {unitProfit < 0 && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">
              現在の単価設定では<strong>1ユニット▲¥{Math.abs(unitProfit)}</strong>の赤字です。
              損益分岐点は <strong>15分あたり {Math.ceil(chimeCostPerUnit / (1 - CREATOR_SHARE))}円以上</strong>の課金が必要です。
              BasicプランMRRまたは最低単価の引き上げを検討してください。
            </p>
          </div>
        )}
      </div>

      {/* 累積収支 */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">累計実績</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-xs text-muted-foreground">
                <th className="text-left py-2 px-3">項目</th>
                <th className="text-right py-2 px-3">金額</th>
                <th className="text-right py-2 px-3 hidden md:table-cell">備考</th>
              </tr>
            </thead>
            <tbody>
              <Row label="終了通話件数"         value={`${stats.callCount}件`} />
              <Row label="総ユニット数（15分）"  value={`${stats.totalUnits}ユニット`} />
              <Row label="リスナー総支払額"      value={`¥${stats.totalListenerPaid.toLocaleString()}`} note="Stripe外乗せ" color="text-blue-400" />
              <Row label="PF受取コイン合計"      value={`¥${stats.totalCoins.toLocaleString()}`} note="1コイン=1円" color="text-white" />
              <Row label="Chime通信費合計"       value={`▲¥${stats.totalChimeCost.toLocaleString()}`} note="¥4/分" color="text-orange-400" />
              <Row label="クリエイター配分合計"  value={`¥${stats.totalCreatorPayout.toLocaleString()}`} note="85%" color="text-green-400" />
              <Row label="運営手数料合計（15%）" value={`¥${stats.totalPlatformFee.toLocaleString()}`} color="text-yellow-400" />
            </tbody>
          </table>
        </div>

        <div className={`flex items-center justify-between rounded-xl p-4 border-2 ${stats.totalProfit >= 0 ? "bg-primary/10 border-primary/40" : "bg-red-500/10 border-red-500/40"}`}>
          <div>
            <p className="text-sm font-bold">運営純利益合計</p>
            <p className="text-xs text-muted-foreground">運営手数料 ¥{stats.totalPlatformFee.toLocaleString()} − Chime ¥{stats.totalChimeCost.toLocaleString()}</p>
          </div>
          <p className={`text-2xl font-black ${stats.totalProfit >= 0 ? "text-primary" : "text-red-400"}`}>
            {stats.totalProfit >= 0 ? "+" : ""}¥{stats.totalProfit.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 計算根拠 */}
      <div className="bg-secondary/40 rounded-lg p-3 space-y-1">
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold mb-2">
          <Info className="w-3 h-3" /> 計算根拠（確定仕様）
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <p>・リスナー支払額 = ceil((150+40)÷(1-0.036)) = <span className="text-white">197円</span></p>
          <p>・PF受取 = <span className="text-white">150円</span>（Stripe手数料はリスナー負担）</p>
          <p>・Chime通信費 = 4円×15分 = <span className="text-orange-300">60円</span></p>
          <p>・クリエイター = floor(150×0.85) = <span className="text-green-300">127円</span></p>
          <p>・PF手数料 = 150-127 = <span className="text-yellow-300">23円</span></p>
          <p>・純利益 = 23-60 = <span className="text-red-300">▲37円/ユニット</span></p>
        </div>
      </div>
    </div>
  );
}

function UnitCell({ label, value, sub, color }) {
  return (
    <div className="bg-background/60 rounded-lg p-3 text-center space-y-0.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-black ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Row({ label, value, note, color = "" }) {
  return (
    <tr className="border-b border-border/30 hover:bg-secondary/50">
      <td className="py-2 px-3 text-sm">{label}</td>
      <td className={`text-right py-2 px-3 font-semibold ${color}`}>{value}</td>
      <td className="text-right py-2 px-3 text-xs text-muted-foreground hidden md:table-cell">{note || ""}</td>
    </tr>
  );
}