import React, { useState, useEffect } from "react";
import { DollarSign } from "lucide-react";

// IVS コスト概算: 入力 $0.20/時間 + 出力 $0.05/視聴者/時間
const INPUT_COST_PER_HOUR_YEN = 30;   // ¥30/時間（入力）
const OUTPUT_COST_PER_VIEWER_HOUR_YEN = 5; // ¥5/視聴者/時間（出力）

export default function LiveCostTracker({ startedAt, viewerCount }) {
  const [costYen, setCostYen] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const update = () => {
      const hours = (Date.now() - start) / 3600000;
      const inputCost = hours * INPUT_COST_PER_HOUR_YEN;
      const outputCost = hours * (viewerCount || 0) * OUTPUT_COST_PER_VIEWER_HOUR_YEN;
      setCostYen(Math.round(inputCost + outputCost));
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [startedAt, viewerCount]);

  return (
    <span className="flex items-center gap-1.5 bg-black/70 text-yellow-300 font-bold px-3 py-1 rounded-full text-xs">
      <DollarSign className="w-3 h-3" />
      コスト概算 ¥{costYen.toLocaleString()}
    </span>
  );
}