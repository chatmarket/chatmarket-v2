import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

const PLAN_LIMITS = {
  free: 60,      // FREEプラン: 1日60分
  basic: 120,    // BASICプラン: 1日120分
  default: 60,   // デフォルト: 60分
};

const STORAGE_KEY = "daily_view_time";
const UPSELL_SHOWN_KEY = "upsell_45min_shown";

/**
 * プラン別・視聴時間制限フック
 * ユーザーのプランに応じて自動的に視聴上限を切り替え
 * 45分超過時にUpsellポップアップを表示
 */
export function useDailyViewTimeLimit(userId, userPlan = "free") {
  const [dailyViewedMinutes, setDailyViewedMinutes] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [upsellShown, setUpsellShown] = useState(false);
  
  // プランに応じた制限時間を取得
  const dailyLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.default;

  // ローカルストレージから今日の視聴時間を取得
  const loadDailyViewTime = useCallback(() => {
    if (!userId) return 0;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return 0;

    const data = JSON.parse(stored);
    const today = new Date().toISOString().split("T")[0];

    // 昨日のデータなら初期化
    if (data.date !== today) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, minutes: 0 }));
      localStorage.removeItem(UPSELL_SHOWN_KEY); // Upsell表示フラグもリセット
      return 0;
    }

    return data.minutes || 0;
  }, [userId]);

  // 初期化
  useEffect(() => {
    const viewed = loadDailyViewTime();
    setDailyViewedMinutes(viewed);
    setIsLimitReached(viewed >= dailyLimit);
    setUpsellShown(localStorage.getItem(UPSELL_SHOWN_KEY) === "true");
  }, [loadDailyViewTime, userId, dailyLimit]);

  // 視聴時間を加算
  const addViewTime = useCallback((minutes) => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    const current = loadDailyViewTime();
    const newTotal = current + minutes;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, minutes: newTotal }));
    setDailyViewedMinutes(newTotal);

    // 45分超過 & FREEプラン & Upsell未表示 → Upsell通知
    if (newTotal >= 45 && newTotal < dailyLimit && userPlan === "free" && !upsellShown) {
      localStorage.setItem(UPSELL_SHOWN_KEY, "true");
      setUpsellShown(true);
      toast.success(
        "🎯 プラン加入で明日から1日の視聴枠が2時間に拡張！さらに多くのコンテンツを楽しめます",
        { duration: 5000 }
      );
    }

    // 上限到達
    if (newTotal >= dailyLimit) {
      setIsLimitReached(true);
      toast.error(`本日の視聴上限に達しました。明日またご利用ください。（上限：${dailyLimit}分）`);
    }
  }, [userId, loadDailyViewTime, dailyLimit, userPlan, upsellShown]);

  // 残り時間（分）
  const remainingMinutes = Math.max(0, dailyLimit - dailyViewedMinutes);

  return {
    dailyViewedMinutes,
    remainingMinutes,
    isLimitReached,
    addViewTime,
    DAILY_LIMIT: dailyLimit,
    currentPlan: userPlan,
    nextPlanLimit: userPlan === "free" ? 120 : 120, // 常に次レベルを表示
  };
}