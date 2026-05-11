import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { IVS_COSTS, YELL_COIN_SETTINGS } from "@/lib/constants";

// ⚠️ AWS IVS コスト設定 LOCKED（lib/constants.js から参照）
const INPUT_COST_PER_HOUR_YEN = IVS_COSTS.INPUT_COST_PER_HOUR_YEN;
const OUTPUT_COST_PER_VIEWER_HOUR_YEN = IVS_COSTS.OUTPUT_COST_PER_VIEWER_HOUR_YEN;
const COIN_TO_YEN = YELL_COIN_SETTINGS.COIN_TO_YEN_RATE;
const REVENUE_RATE = YELL_COIN_SETTINGS.CREATOR_REVENUE_RATE;

export default function LiveCostTracker({ startedAt, viewerCount, priceCoins = 0 }) {
  const [costYen, setCostYen] = useState(0);
  const [revenueYen, setRevenueYen] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const update = () => {
      const hours = (Date.now() - start) / 3600000;
      const inputCost = hours * INPUT_COST_PER_HOUR_YEN;
      const outputCost = hours * (viewerCount || 0) * OUTPUT_COST_PER_VIEWER_HOUR_YEN;
      setCostYen(Math.round(inputCost + outputCost));

      // 売上概算: 視聴者数 × 価格コイン × 円換算 × 還元率
      // （概算なので視聴者全員が購入済みと仮定）
      const gross = (viewerCount || 0) * (priceCoins || 0) * COIN_TO_YEN * REVENUE_RATE;
      setRevenueYen(Math.round(gross));
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [startedAt, viewerCount, priceCoins]);

  const profit = revenueYen - costYen;
  const isProfit = profit >= 0;

  return (
    <div className="flex flex-col gap-1 items-end">
      {/* 利益（メイン） */}
      <span className={`flex items-center gap-1.5 font-bold px-3 py-1 rounded-full text-sm shadow-lg ${
        isProfit ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
      }`}>
        {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
        現在の利益 {isProfit ? "+" : ""}¥{profit.toLocaleString()}
      </span>
      {/* コスト内訳（小さく） */}
      <span className="flex items-center gap-1.5 bg-black/70 text-yellow-300/80 font-medium px-2 py-0.5 rounded-full text-[10px]">
        コスト ¥{costYen.toLocaleString()} / 売上 ¥{revenueYen.toLocaleString()}
      </span>
    </div>
  );
}