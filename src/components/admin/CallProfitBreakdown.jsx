import React, { useMemo } from "react";
import { Phone, TrendingDown, TrendingUp, AlertTriangle, Info } from "lucide-react";

/**
 * AWS Chime SDK移行後の正確な収支パネル
 *
 * ── 前提（確定仕様・AWS公式単価で再精査済み） ──────────────────────
 *   課金単位         : 15分 / 150コイン（1コイン=1円）
 *   Stripe手数料     : リスナー負担・外乗せ方式（3.6%定率のみ・固定費¥0）
 *     → リスナー実支払額 = ceil(150 / (1 - 0.036)) = 156円
 *     → Stripeへ        = 6円（プラットフォーム持ち出し0円）
 *
 *   ★ AWS Chime SDK 公式単価（ap-northeast-1）★
 *     WebRTC Attendee Minutes: $0.0017 / 分 / 参加者
 *     1対1通話（2参加者）× 15分 = $0.0017 × 2 × 15 = $0.051
 *     $0.051 × 155円/$ = 約7.9円 → 切り上げ 約8円/ユニット
 *     ※ 旧試算の「¥4/分 × 15分 = ¥60」は Media Pipeline(録画)等を
 *        誤って含めた過剰見積もり。プレーン1対1通話の正確なコストは8円。
 *
 *   クリエイター配分 : 150円 × 85% = 127.5円 → floor = 127円
 *   運営取り分       : 150円 × 15% = 22.5円 → 23円
 *   運営純利益       : 23円 - 8円 = +15円/ユニット（黒字）✅
 * ──────────────────────────────────────────────────────────────────
 */

// ── AWS Chime SDK 公式単価（ap-northeast-1 確認済み） ──────────────
const CHIME_USD_PER_MIN_PER_ATTENDEE = 0.0017; // $0.0017/分/参加者（公式）
const USD_TO_JPY                     = 155;     // 1ドル155円
const CALL_ATTENDEES                 = 2;       // 1対1通話 = 2参加者

// ── 定数 ──────────────────────────────────────────────────────────
const COIN_PER_UNIT       = 150;   // 15分あたりコイン
const STRIPE_RATE         = 0.036; // Stripe Japan 国内カード: 定率のみ・固定費なし
const UNIT_MINUTES        = 15;
const CREATOR_SHARE       = 0.85;

// リスナーが実際に支払う金額（外乗せ）
// ceil(150 / (1 - 0.036)) = ceil(155.6) = 156円
const listenerCharge = Math.ceil(COIN_PER_UNIT / (1 - STRIPE_RATE));                 // 156円
// Stripeが持っていく = 156 - 150 = 6円
const stripeFee           = listenerCharge - COIN_PER_UNIT;                           // 6円
// プラットフォームが受け取るコイン（Stripe手数料はリスナー負担なので150円がそのまま入る）
const platformReceive     = COIN_PER_UNIT;                                             // 150円
// AWS Chime通信費 / ユニット（公式単価: $0.0017 × 2人 × 15分 × 155円 = 7.9円 → 8円）
const chimeCostPerUnit    = Math.ceil(
  CHIME_USD_PER_MIN_PER_ATTENDEE * CALL_ATTENDEES * UNIT_MINUTES * USD_TO_JPY
);                                                                                     // 8円
// クリエイター配分
const creatorPayout       = Math.floor(COIN_PER_UNIT * CREATOR_SHARE);               // 127円
// 運営取り分（手数料15%）
const platformFee         = COIN_PER_UNIT - creatorPayout;                            // 23円
// 運営純利益 = 23 - 8 = +15円
const unitProfit          = platformFee - chimeCostPerUnit;                           // +15円

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
            sub={`Stripe外乗せ（+¥${stripeFee}）`}
            color="text-blue-400"
          />
          <UnitCell
            label="PF受取"
            value={`¥${platformReceive}`}
            sub="固定費なし・定率3.6%のみ"
            color="text-white"
          />
          <UnitCell
            label="Chime通信費"
            value={`▲¥${chimeCostPerUnit}`}
            sub={`$0.0017×2人×15分×¥155`}
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

        {unitProfit < 0 ? (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">
              現在の単価設定では<strong>1ユニット▲¥{Math.abs(unitProfit)}</strong>の赤字です。
              損益分岐点は <strong>15分あたり {Math.ceil(chimeCostPerUnit / (1 - CREATOR_SHARE))}円以上</strong>の課金が必要です。
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 bg-primary/10 border border-primary/30 rounded-lg p-3">
            <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-primary/90">
              AWS公式単価（$0.0017/分/人）で計算すると<strong>1ユニット+¥{unitProfit}の黒字</strong>です。
              旧試算の「¥4/分」は録画（Media Pipeline）を含む過剰見積もりでした。
              プレーンな1対1通話なら<strong>150円モデルは成立</strong>します。✅
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
              <Row label="Chime通信費合計"       value={`▲¥${stats.totalChimeCost.toLocaleString()}`} note="$0.0017×2人×155円" color="text-orange-400" />
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
          <p>・Stripe Japan 国内カード = <span className="text-green-300">3.6%定率のみ・固定費¥0</span></p>
          <p>・リスナー支払額 = ceil(150÷0.964) = <span className="text-white">156円</span></p>
          <p>・PF受取 = <span className="text-white">150円</span>（Stripeへ6円・リスナー負担）</p>
          <p>・Chime = <span className="text-green-300">$0.0017×2人×15分×¥155 = 約¥{chimeCostPerUnit}</span>（録画なし）</p>
          <p>・クリエイター = floor(150×0.85) = <span className="text-green-300">127円</span></p>
          <p>・PF手数料 = 150-127 = <span className="text-yellow-300">23円</span></p>
          <p>・純利益 = 23-{chimeCostPerUnit} = <span className={unitProfit >= 0 ? "text-primary font-bold" : "text-red-300"}>
            {unitProfit >= 0 ? `+${unitProfit}円/ユニット ✅` : `▲${Math.abs(unitProfit)}円/ユニット`}
          </span></p>
          <p className="text-[10px] text-yellow-400 col-span-2">※ 録画（Media Capture/Concatenation）を使う場合は別途コスト加算あり</p>
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