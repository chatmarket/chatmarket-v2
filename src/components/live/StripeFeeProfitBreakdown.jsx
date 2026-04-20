import React from "react";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";

/**
 * Stripe手数料構造の透明性表示コンポーネント
 * 
 * リスナー支払い → Stripe処理 → ライバー受取 → 運営利益 → AWSコスト
 * の流れを可視化し、社長の「1円の赤字も出さない」利益ガードを表現
 */
export default function StripeFeeProfitBreakdown({ price, duration, quality }) {
  // Stripe処理料金: 3.6%のみ（Stripe Japan 国内カード、固定手数料なし）
  const STRIPE_RATE = 0.036;
  const STRIPE_FIXED = 0; // ¥0（Stripe Japan 国内カード）
  
  // ライバー還元率（BASIC/PPVプラン: 85%）
  const LIVER_RATE = 0.85;
  
  // 運営手数料率: 15%
  const PLATFORM_RATE = 0.15;
  
  // AWS IVS実費（高画質 1080p: 15分あたり約7円）
  const AWS_COST_PER_15MIN = quality === "1080p" ? 7 : 5;
  const awsCostTotal = Math.round((duration / 15) * AWS_COST_PER_15MIN);
  
  // 計算ロジック
  const listenerPayment = Math.round(price + (price * STRIPE_RATE) + STRIPE_FIXED); // リスナー最終支払い額
  const stripeFee = Math.round((price * STRIPE_RATE) + STRIPE_FIXED); // Stripe控除額
  const afterStripe = price; // Stripe後の金額（プラットフォーム側）
  const liverRevenue = Math.round(afterStripe * LIVER_RATE); // ライバー受取
  const platformGross = Math.round(afterStripe * PLATFORM_RATE); // 運営総取り
  const platformProfit = Math.max(0, platformGross - awsCostTotal); // 運営純利（赤字チェック）
  
  // 15分単位の時間換算
  const durationLabel = duration < 60 ? `${duration}分` : `${Math.floor(duration / 60)}時間${duration % 60}分`;
  const blocks15min = Math.ceil(duration / 15);
  
  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-sm">💰 Stripe手数料と運営利益構造</h3>
      </div>
      
      {/* フローチャート */}
      <div className="space-y-2 text-xs">
        {/* Row 1: リスナー支払い */}
        <div className="bg-secondary rounded-lg p-3 space-y-1">
          <p className="font-semibold text-foreground">📱 リスナーが支払う金額</p>
          <p className="text-lg font-black text-primary">
            ¥{listenerPayment.toLocaleString()}
          </p>
          <p className="text-muted-foreground text-[10px]">
              = 配信料金 ¥{price} + Stripeプラットフォーム手数料 ¥{stripeFee}（3.6%外乗せ）
            </p>
        </div>
        
        {/* Row 2: Stripe後 */}
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-[10px]">Stripeプラットフォーム手数料 (-3.6%、固定費なし)</div>
          <div className="text-muted-foreground text-[10px]">↓</div>
        </div>
        
        {/* Row 3: ライバー vs 運営 */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-1">
            <p className="font-semibold text-green-400">🎬 ライバー受取</p>
            <p className="text-lg font-black text-green-300">
              ¥{liverRevenue.toLocaleString()}
            </p>
            <p className="text-[10px] text-green-300/70">
              {afterStripe} × 85%
            </p>
          </div>
          
          <div className={`rounded-lg p-3 space-y-1 border ${
            platformProfit > 0
              ? "bg-yellow-500/10 border-yellow-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}>
            <p className={`font-semibold ${platformProfit > 0 ? "text-yellow-400" : "text-red-400"}`}>
              📊 運営利益
            </p>
            <p className={`text-lg font-black ${platformProfit > 0 ? "text-yellow-300" : "text-red-300"}`}>
              ¥{platformProfit.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {afterStripe} × 15% - AWS ¥{awsCostTotal}
            </p>
          </div>
        </div>
      </div>
      
      {/* 詳細テーブル */}
      <div className="bg-secondary rounded-lg p-3">
        <table className="w-full text-xs text-muted-foreground">
          <tbody className="space-y-1">
            <tr className="border-b border-border/30 flex justify-between py-1">
              <td>配信料金</td>
              <td className="font-semibold text-foreground">¥{price}</td>
            </tr>
            <tr className="border-b border-border/30 flex justify-between py-1">
              <td>Stripeプラットフォーム手数料（3.6%外乗せ）</td>
              <td className="font-semibold text-red-400">-¥{stripeFee}</td>
            </tr>
            <tr className="border-b border-border/30 flex justify-between py-1 bg-secondary/50">
              <td className="font-semibold">プラットフォーム側</td>
              <td className="font-semibold text-primary">¥{afterStripe}</td>
            </tr>
            <tr className="flex justify-between py-1">
              <td>AWS IVS実費（{durationLabel}分 = {blocks15min}×15分）</td>
              <td className="font-semibold text-orange-400">-¥{awsCostTotal}</td>
            </tr>
            <tr className="border-t border-border/30 flex justify-between py-1 font-bold">
              <td className={platformProfit > 0 ? "text-green-400" : "text-red-400"}>
                運営純利益
              </td>
              <td className={platformProfit > 0 ? "text-green-400" : "text-red-400"}>
                ¥{platformProfit.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* 安全性インジケーター */}
      <div className={`rounded-lg p-2.5 flex items-start gap-2 text-[10px] ${
        platformProfit > 0
          ? "bg-green-500/10 border border-green-500/30 text-green-300"
          : "bg-red-500/10 border border-red-500/30 text-red-300"
      }`}>
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          {platformProfit > 0
            ? `✅ 利益ガード: 社長の純利は ¥${platformProfit}/15分 × ${blocks15min} = 約 ¥${platformProfit * blocks15min} です。`
            : `⚠️ 要注意: このコスト構造では赤字になる可能性があります。`}
        </span>
      </div>
      
      {/* 注記 */}
      <p className="text-[10px] text-muted-foreground border-t border-border/30 pt-2">
        ※ Stripeプラットフォーム手数料は「3.6%」外乗せ（Stripe Japan 国内カード・固定費なし）。AWS実費は{quality === "1080p" ? "1080p（高画質）" : "720p（標準）"}に応じた目安値です。
      </p>
    </div>
  );
}