import React, { useState } from "react";
import { Video, AlertTriangle, CheckCircle, Info, TrendingUp, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * 録画オプション：実費還元モデル（社長方針：透明性の高い実費精算）
 *
 * ── 収支設計 ──────────────────────────────────────────────────────
 *   通話基本料     : 150円  → クリエイター127円 + 運営23円
 *   録画オプション : +50円  → 全額AWSインフラ費用に充当（利益0円）
 *
 *   AWS実費 (15分/録画あり):
 *     WebRTC       : ¥8   ($0.0017×2人×15分×155)
 *     Media Capture: ¥24  ($0.0102×15分×155)
 *     合計         : ¥32
 *
 *   50円 − 32円 = +18円（繰越バッファ、利益計上しない）
 *
 * ── 収支サマリ（1ユニット・録画あり） ────────────────────────────
 *   リスナー支払: 156円（通話）+ 52円（録画: ceil(50/0.964)）= 208円
 *   クリエイター: 127円 (通話分150円の85%)
 *   録画インフラ: 32円  → 運営コスト充当
 *   運営純利益  : 23円 - 8円(WebRTC) = +15円  ← 通話分のみ計上
 *   録画P/L     : 50円 - 32円 = +18円 → インフラバッファ（利益0扱い）
 * ──────────────────────────────────────────────────────────────────
 */

const USD = 155;
const UNIT = 15;

const COSTS = {
  webrtc:  { usd: 0.0017 * 2 * UNIT, label: 'WebRTC (2人×15分)', tier: 'base' },
  capture: { usd: 0.0102 * UNIT,     label: 'Media Capture (15分)', tier: 'recording' },
  concat:  { usd: 0.0102 * UNIT,     label: 'Concatenation (15分)', tier: 'optional' },
  s3:      { usd: 0.0006,            label: 'S3保存 (≈50MB)', tier: 'optional' },
};

const toYen = (usd) => Math.ceil(usd * USD);

// コスト定数
const WEBRTC_COST  = toYen(COSTS.webrtc.usd);   // 8円
const CAPTURE_COST = toYen(COSTS.capture.usd);  // 24円
const TOTAL_REC_COST = WEBRTC_COST + CAPTURE_COST; // 32円

const CALL_COINS      = 150;
const CREATOR_RATE    = 0.85;
const CREATOR_PAYOUT  = Math.floor(CALL_COINS * CREATOR_RATE); // 127円
const PLATFORM_FEE    = CALL_COINS - CREATOR_PAYOUT;           // 23円
const RECORDING_OPT   = 50; // 録画オプション料金

const patterns = [
  {
    id: 'A',
    label: 'パターンA: 録画なし（標準）',
    keys: ['webrtc'],
    revenue: CALL_COINS,
    optRevenue: 0,
    color: 'border-primary/40 bg-primary/5',
    badge: '黒字確定',
    badgeColor: 'bg-primary/20 text-primary',
    icon: CheckCircle,
    iconColor: 'text-primary',
  },
  {
    id: 'B',
    label: 'パターンB: 録画あり（実費還元オプション）',
    keys: ['webrtc', 'capture'],
    revenue: CALL_COINS,
    optRevenue: RECORDING_OPT,
    color: 'border-cyan-500/30 bg-cyan-500/5',
    badge: '実費還元モデル',
    badgeColor: 'bg-cyan-500/20 text-cyan-300',
    icon: ShieldCheck,
    iconColor: 'text-cyan-400',
  },
  {
    id: 'C',
    label: 'パターンC: 録画+連結（フルアーカイブ）',
    keys: ['webrtc', 'capture', 'concat', 's3'],
    revenue: CALL_COINS,
    optRevenue: RECORDING_OPT,
    color: 'border-orange-500/30 bg-orange-500/5',
    badge: '要検討',
    badgeColor: 'bg-orange-500/20 text-orange-400',
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
  },
];

function calcPattern(p) {
  const totalCostYen = p.keys.reduce((s, k) => s + toYen(COSTS[k].usd), 0);
  // 通話分のみで純利益計算（録画分は分離）
  const callProfit = PLATFORM_FEE - WEBRTC_COST;           // 15円
  const recBalance = p.optRevenue - (totalCostYen - WEBRTC_COST); // 録画料 - 録画コスト
  return { totalCostYen, callProfit, recBalance };
}

export default function RecordingCostBreakdown() {
  const [selected, setSelected] = useState('B');

  // 実際の録画オプション利用実績を取得
  const { data: calls = [] } = useQuery({
    queryKey: ['recording-option-calls'],
    queryFn: () => base44.entities.VideoCall.filter({ recording_option: true }),
  });

  const recCallCount = calls.length;
  const recRevenue   = recCallCount * RECORDING_OPT;
  const recInfraCost = recCallCount * (CAPTURE_COST); // WebRTCは通話基本に含む
  const recBalance   = recRevenue - recInfraCost;

  const pattern = patterns.find(p => p.id === selected);
  const { totalCostYen, callProfit, recBalance: patRecBalance } = calcPattern(pattern);

  return (
    <div className="space-y-5">
      {/* タイトル */}
      <div className="flex items-center gap-2 flex-wrap">
        <Video className="w-4 h-4 text-cyan-400" />
        <h3 className="font-bold text-base">録画オプション 収支（実費還元モデル）</h3>
        <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-bold">
          利益計上なし・AWS実費充当
        </span>
      </div>

      {/* 方針説明 */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <p className="text-sm font-bold text-cyan-300">経営方針：透明性の高い実費精算モデル</p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 録画オプション <strong className="text-white">¥50/15分</strong> は全額AWSインフラ費（Media Capture + S3）に充当</p>
          <p>• 運営の収益には計上しない。差額はインフラバッファとして積み立て</p>
          <p>• 通話基本料(¥150)の収支と完全に分離して管理する</p>
        </div>
      </div>

      {/* 1ユニットあたりの収支 */}
      <div className="bg-secondary/60 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">1ユニット（15分）の収支比較</p>
        <div className="grid grid-cols-2 gap-3">
          {/* 通話基本 */}
          <div className="bg-background/60 rounded-xl p-3 space-y-2 border border-border/40">
            <p className="text-[11px] font-bold text-muted-foreground">通話基本料 ¥150</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">クリエイター(85%)</span>
                <span className="text-green-400 font-bold">¥{CREATOR_PAYOUT}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PF手数料(15%)</span>
                <span className="text-yellow-400 font-bold">¥{PLATFORM_FEE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">WebRTCコスト</span>
                <span className="text-orange-400 font-bold">▲¥{WEBRTC_COST}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1">
                <span className="font-bold">運営純利益</span>
                <span className="text-primary font-black">+¥{callProfit}</span>
              </div>
            </div>
          </div>
          {/* 録画オプション */}
          <div className="bg-background/60 rounded-xl p-3 space-y-2 border border-cyan-500/20">
            <p className="text-[11px] font-bold text-cyan-400">録画オプション ¥50</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Media Captureコスト</span>
                <span className="text-orange-400 font-bold">▲¥{CAPTURE_COST}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">クリエイター還元</span>
                <span className="text-muted-foreground">¥0（対象外）</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-1">
                <span className="font-bold">収支差額</span>
                <span className={`font-black ${RECORDING_OPT - CAPTURE_COST >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                  {RECORDING_OPT - CAPTURE_COST >= 0 ? '+' : ''}¥{RECORDING_OPT - CAPTURE_COST}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground">※差額はインフラバッファ（利益計上なし）</p>
            </div>
          </div>
        </div>
      </div>

      {/* 累積実績 */}
      <div className="bg-secondary/60 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">録画オプション 累計実績</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-background/60 rounded-lg p-3">
            <p className="text-muted-foreground">利用件数</p>
            <p className="font-black text-lg text-white">{recCallCount}件</p>
          </div>
          <div className="bg-background/60 rounded-lg p-3">
            <p className="text-muted-foreground">オプション収入</p>
            <p className="font-black text-lg text-cyan-400">¥{recRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-background/60 rounded-lg p-3">
            <p className="text-muted-foreground">Chime実費</p>
            <p className="font-black text-lg text-orange-400">¥{recInfraCost.toLocaleString()}</p>
          </div>
        </div>
        <div className={`rounded-xl p-3 border-2 flex items-center justify-between ${recBalance >= 0 ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-red-500/10 border-red-500/40'}`}>
          <div>
            <p className="text-sm font-bold">インフラバッファ累計</p>
            <p className="text-xs text-muted-foreground">オプション収入 ¥{recRevenue} − Chime実費 ¥{recInfraCost}（運営利益には含まない）</p>
          </div>
          <p className={`text-2xl font-black ${recBalance >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            {recBalance >= 0 ? '+' : ''}¥{recBalance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* パターン比較 */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">構成パターン比較</p>
        {patterns.map(p => {
          const Icon = p.icon;
          const c = calcPattern(p);
          const cost = p.keys.reduce((s, k) => s + toYen(COSTS[k].usd), 0);
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${p.color} ${selected === p.id ? 'ring-2 ring-primary/40' : 'opacity-80 hover:opacity-100'}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${p.iconColor}`} />
                  <span className="font-bold text-sm">{p.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.badgeColor}`}>{p.badge}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">AWS実費</p>
                  <p className="font-bold text-sm text-orange-400">¥{cost}</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background/40 rounded-lg p-2">
                  <p className="text-muted-foreground">通話分の運営純利益</p>
                  <p className={`font-black text-base ${c.callProfit >= 0 ? 'text-primary' : 'text-red-400'}`}>
                    {c.callProfit >= 0 ? '+' : ''}¥{c.callProfit}
                  </p>
                </div>
                {p.optRevenue > 0 && (
                  <div className="bg-background/40 rounded-lg p-2">
                    <p className="text-muted-foreground">録画料インフラ収支</p>
                    <p className={`font-black text-base ${c.recBalance >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
                      {c.recBalance >= 0 ? '+' : ''}¥{c.recBalance}（バッファ）
                    </p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 計算根拠 */}
      <div className="bg-secondary/40 rounded-lg p-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold mb-2">
          <Info className="w-3 h-3" /> 計算根拠
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>・WebRTC: $0.0017 × 2人 × 15分 × ¥155 = <span className="text-white">¥{WEBRTC_COST}</span>（通話基本に含む）</p>
          <p>・Media Capture: $0.0102 × 15分 × ¥155 = <span className="text-orange-300">¥{CAPTURE_COST}</span>（録画オプション¥50で充当）</p>
          <p>・録画収支: ¥{RECORDING_OPT} − ¥{CAPTURE_COST} = <span className="text-cyan-400">+¥{RECORDING_OPT - CAPTURE_COST}</span>（利益計上なし・バッファ）</p>
          <p>・通話純利益: ¥{PLATFORM_FEE}(PF手数料) − ¥{WEBRTC_COST}(WebRTC) = <span className="text-primary font-bold">+¥{callProfit}</span>/ユニット</p>
        </div>
      </div>
    </div>
  );
}