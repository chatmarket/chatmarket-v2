import React, { useState } from "react";
import { Video, DollarSign, AlertTriangle, CheckCircle, Info, TrendingUp } from "lucide-react";

/**
 * AWS Chime SDK 録画コスト公式試算（ap-northeast-1 確認済み）
 *
 * ── AWS公式単価 ───────────────────────────────────────────────────
 *   WebRTC Attendee     : $0.0017 /分/人
 *   Media Capture       : $0.0102 /分  ← 公式ページより
 *   Concatenation       : $0.0102 /分  ← 任意・単一ファイル化
 *   S3 ストレージ       : $0.025  /GB/月（15分≒50MB≒¥0.2）
 *   USD/JPY             : 155円
 *
 * ── 15分/1対1通話 試算 ───────────────────────────────────────────
 *   パターンA: 録画なし
 *     WebRTC: $0.0017×2×15 = $0.051 ≒ ¥8
 *     合計: ¥8   →  150円売上で +¥15 黒字
 *
 *   パターンB: 録画あり(Capture only)
 *     WebRTC: ¥8 + Capture: $0.0102×15×155 = $0.153×155 ≒ ¥24
 *     合計: ¥32  →  150円売上で ▲¥9 赤字
 *
 *   パターンC: 録画+連結(Capture+Concatenation)
 *     合計: ¥8 + ¥24 + ¥24 = ¥56  →  150円売上で ▲¥33 赤字
 *
 * ★ 結論: 「録画込みで¥15以内」は不可能。
 *    アーカイブ販売を有効にする場合は通話料+録画オプション料（+¥30程度）設計が必要。
 * ──────────────────────────────────────────────────────────────────
 */

const USD = 155;
const UNIT = 15; // 分

const COSTS = {
  webrtc:      { usd: 0.0017 * 2 * UNIT, label: 'WebRTC (2人×15分)', tier: 'base' },
  capture:     { usd: 0.0102 * UNIT,     label: 'Media Capture (15分)', tier: 'recording' },
  concat:      { usd: 0.0102 * UNIT,     label: 'Concatenation (15分)', tier: 'optional' },
  s3:          { usd: 0.0006,            label: 'S3保存 (≈50MB)', tier: 'optional' },
};

const toYen = (usd) => Math.ceil(usd * USD);

const patterns = [
  {
    id: 'A',
    label: 'パターンA: 録画なし（推奨）',
    keys: ['webrtc'],
    profit: 150 - Math.floor(150 * 0.85) - toYen(COSTS.webrtc.usd),
    color: 'border-primary/40 bg-primary/5',
    badge: '黒字確定',
    badgeColor: 'bg-primary/20 text-primary',
    icon: CheckCircle,
    iconColor: 'text-primary',
  },
  {
    id: 'B',
    label: 'パターンB: 録画あり（Capture）',
    keys: ['webrtc', 'capture'],
    profit: 150 - Math.floor(150 * 0.85) - toYen(COSTS.webrtc.usd) - toYen(COSTS.capture.usd),
    color: 'border-red-500/30 bg-red-500/5',
    badge: '赤字注意',
    badgeColor: 'bg-red-500/20 text-red-400',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
  },
  {
    id: 'C',
    label: 'パターンC: 録画+連結（フルアーカイブ）',
    keys: ['webrtc', 'capture', 'concat', 's3'],
    profit: 150 - Math.floor(150 * 0.85) - toYen(COSTS.webrtc.usd) - toYen(COSTS.capture.usd) - toYen(COSTS.concat.usd) - toYen(COSTS.s3.usd),
    color: 'border-orange-500/30 bg-orange-500/5',
    badge: '要追加課金',
    badgeColor: 'bg-orange-500/20 text-orange-400',
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
  },
];

const ARCHIVE_STRATEGY = [
  { label: '通話料（録画なし基本）', yen: 150, type: 'revenue' },
  { label: '録画オプション追加料', yen: 50,  type: 'revenue' },
  { label: 'WebRTC + Capture合計', yen: -32, type: 'cost' },
  { label: '純利益（録画込み）',   yen: null, type: 'profit' },
];

export default function RecordingCostBreakdown() {
  const [selected, setSelected] = useState('A');

  const pattern = patterns.find(p => p.id === selected);
  const totalCostUsd = pattern.keys.reduce((s, k) => s + COSTS[k].usd, 0);
  const totalCostYen = toYen(totalCostUsd);
  const platformFee  = 150 - Math.floor(150 * 0.85); // 23円

  // アーカイブ戦略の計算
  const archiveRevenue = 150 + 50; // 200円
  const archiveCost    = toYen(COSTS.webrtc.usd) + toYen(COSTS.capture.usd); // 32円
  const archiveCreator = Math.floor(150 * 0.85); // 127円（通話分のみ）
  const archiveProfit  = platformFee + 50 - archiveCost; // 手数料23 + 録画オプション50 - コスト32 = 41円

  return (
    <div className="space-y-5">
      {/* タイトル */}
      <div className="flex items-center gap-2">
        <Video className="w-4 h-4 text-cyan-400" />
        <h3 className="font-bold text-base">録画コスト精査（AWS公式単価）</h3>
        <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
          $0.0017/分/人 公式確認済み
        </span>
      </div>

      {/* 公式単価テーブル */}
      <div className="bg-secondary/60 rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">AWS公式単価（ap-northeast-1 / USD×155円）</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(COSTS).map(([key, c]) => (
            <div key={key} className={`rounded-lg p-3 ${c.tier === 'recording' ? 'bg-orange-500/10 border border-orange-500/20' : c.tier === 'optional' ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-background/60'}`}>
              <p className="text-[10px] text-muted-foreground">{c.label}</p>
              <p className="font-bold text-sm">${c.usd.toFixed(4)}</p>
              <p className="text-xs text-primary font-bold">≈ ¥{toYen(c.usd)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* パターン選択 */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">構成パターン比較</p>
        {patterns.map(p => {
          const Icon = p.icon;
          const cost = toYen(p.keys.reduce((s, k) => s + COSTS[k].usd, 0));
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`w-full text-left rounded-xl border-2 p-4 transition-all ${p.color} ${selected === p.id ? 'ring-2 ring-primary/40' : 'opacity-80 hover:opacity-100'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${p.iconColor}`} />
                  <span className="font-bold text-sm">{p.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${p.badgeColor}`}>{p.badge}</span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Chimeコスト</p>
                  <p className="font-bold text-sm text-orange-400">¥{cost}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>売上¥150 − クリエイター¥{Math.floor(150 * 0.85)} − コスト¥{cost} =</span>
                <span className={`font-black text-base ${p.profit >= 0 ? 'text-primary' : 'text-red-400'}`}>
                  {p.profit >= 0 ? '+' : ''}¥{p.profit}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 重要警告 */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
          <p className="text-sm font-bold text-orange-300">「録画込みで¥15以内」は現時点では不可能</p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Media Captureだけで <strong className="text-orange-300">¥24/15分</strong> の追加コストが発生（AWS公式: $0.0102/分）</p>
          <p>• 録画なし（パターンA）= <strong className="text-primary">¥8コスト・¥15黒字</strong> ← これが正しい構成</p>
          <p>• 録画あり（パターンB）= <strong className="text-red-400">¥32コスト・▲¥9赤字</strong> ← 追加料金設計が必須</p>
        </div>
      </div>

      {/* アーカイブ販売で回収する戦略 */}
      <div className="bg-primary/5 border border-primary/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold">推奨: 「録画オプション¥50」追加課金モデル</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-background/60 rounded-lg p-3">
            <p className="text-muted-foreground">通話基本</p>
            <p className="font-black text-lg text-white">¥150</p>
          </div>
          <div className="bg-background/60 rounded-lg p-3">
            <p className="text-muted-foreground">録画オプション</p>
            <p className="font-black text-lg text-primary">+¥50</p>
          </div>
          <div className="bg-background/60 rounded-lg p-3">
            <p className="text-muted-foreground">運営純利益</p>
            <p className={`font-black text-lg ${archiveProfit >= 0 ? 'text-primary' : 'text-red-400'}`}>+¥{archiveProfit}</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>計算: PF手数料(¥23) + 録画料(¥50) − Chimeコスト(¥32) = <strong className="text-primary">+¥{archiveProfit}</strong></p>
          <p>さらにアーカイブ動画をVOD販売すれば追加収益も獲得可能</p>
        </div>
      </div>

      {/* 計算根拠 */}
      <div className="bg-secondary/40 rounded-lg p-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-bold mb-2">
          <Info className="w-3 h-3" /> 計算根拠（AWS公式・全項目）
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          <p>・WebRTC: $0.0017 × 2人 × 15分 × ¥155 = <span className="text-white">¥{toYen(COSTS.webrtc.usd)}</span></p>
          <p>・Media Capture: $0.0102 × 15分 × ¥155 = <span className="text-orange-300">¥{toYen(COSTS.capture.usd)}</span></p>
          <p>・Concatenation: $0.0102 × 15分 × ¥155 = <span className="text-yellow-300">¥{toYen(COSTS.concat.usd)}</span>（任意）</p>
          <p>・S3: 15分≒50MB → $0.025/GB × 0.05GB × ¥155 = <span className="text-muted-foreground">≈¥{toYen(COSTS.s3.usd)}</span>（無視レベル）</p>
        </div>
      </div>
    </div>
  );
}