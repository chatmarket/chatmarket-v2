import React, { useState } from "react";
import { Zap, TrendingUp, Users } from "lucide-react";
import { Slider } from "@/components/ui/slider";

/**
 * 収益逆算シミュレーター
 * 「いくら稼ぐか」を可視化するコンポーネント
 */
export default function RevenueSimulator({ price, duration, revenueRate = 0.85 }) {
  const [viewerCount, setViewerCount] = useState(100);
  
  // 1人あたりの報酬（コイン）
  const revenuePerViewer = price * revenueRate;
  
  // 総報酬（視聴者数 × コインあたりの報酬円換算）
  // 1コイン = 1.1円（実際の換算）
  const coinToYen = 1.1;
  const totalRevenue = viewerCount * revenuePerViewer * coinToYen;
  
  return (
    <div className="mt-4 rounded-2xl p-5 space-y-4" style={{
      background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.06))",
      border: "2px solid rgba(34,197,94,0.3)",
    }}>
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-green-400" />
        <h3 className="font-black text-green-400 text-lg">💰 収益シミュレーター</h3>
      </div>
      
      {/* メイン数字 */}
      <div className="text-center space-y-1 bg-black/20 rounded-xl p-4">
        <p className="text-sm text-green-300">視聴者が {viewerCount.toLocaleString()} 人で {duration} 分間視聴したら...</p>
        <p className="text-4xl sm:text-5xl font-black text-green-400">
          ¥{Math.floor(totalRevenue).toLocaleString()}
        </p>
        <p className="text-xs text-green-300/70">あなたの報酬 （{Math.round(revenueRate * 100)}%還元）</p>
      </div>
      
      {/* スライダー */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Users className="w-4 h-4 text-green-400" />
            視聴者数を変更してシミュレーション
          </label>
          <span className="text-sm font-bold text-green-400">{viewerCount.toLocaleString()} 人</span>
        </div>
        <Slider
          value={[viewerCount]}
          onValueChange={(v) => setViewerCount(v[0])}
          min={1}
          max={1000}
          step={10}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1人</span>
          <span>1,000人</span>
        </div>
      </div>
      
      {/* 詳細ブレークダウン */}
      <div className="grid grid-cols-2 gap-2 text-xs bg-black/10 rounded-lg p-3">
        <div className="space-y-0.5">
          <p className="text-muted-foreground">1人あたりの報酬</p>
          <p className="font-bold text-green-400">¥{Math.floor(revenuePerViewer * coinToYen)}</p>
        </div>
        <div className="space-y-0.5 text-right">
          <p className="text-muted-foreground">販売価格（1人）</p>
          <p className="font-bold text-foreground">¥{Math.floor(price * coinToYen)}</p>
        </div>
      </div>
      
      {/* ヒント */}
      <div className="text-xs text-green-300/70 bg-green-500/5 border border-green-500/20 rounded-lg p-2.5 flex items-start gap-2">
        <TrendingUp className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          💡 視聴者数が多いほど、あなたの報酬も増えます。質の良い配信で、たくさんのファンを惹きつけましょう！
        </p>
      </div>
    </div>
  );
}