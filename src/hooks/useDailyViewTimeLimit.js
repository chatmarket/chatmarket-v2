import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

const DAILY_VIEW_LIMIT_MINUTES = 60; // 1日の視聴上限：60分
const STORAGE_KEY = "daily_view_time";

/**
 * 1日あたりの動画視聴時間制限フック（15分単位）
 * 購入・視聴記録を集計し、1日60分を超えないように制限
 */
export function useDailyViewTimeLimit(userId) {
  const [dailyViewedMinutes, setDailyViewedMinutes] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);

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
      return 0;
    }

    return data.minutes || 0;
  }, [userId]);

  // 初期化
  useEffect(() => {
    const viewed = loadDailyViewTime();
    setDailyViewedMinutes(viewed);
    setIsLimitReached(viewed >= DAILY_VIEW_LIMIT_MINUTES);
  }, [loadDailyViewTime, userId]);

  // 視聴時間を加算
  const addViewTime = useCallback((minutes) => {
    if (!userId) return;
    const today = new Date().toISOString().split("T")[0];
    const current = loadDailyViewTime();
    const newTotal = current + minutes;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, minutes: newTotal }));
    setDailyViewedMinutes(newTotal);

    if (newTotal >= DAILY_VIEW_LIMIT_MINUTES) {
      setIsLimitReached(true);
      toast.error(`本日の視聴上限に達しました。明日またご利用ください。（上限：${DAILY_VIEW_LIMIT_MINUTES}分）`);
    }
  }, [userId, loadDailyViewTime]);

  // 残り時間（分）
  const remainingMinutes = Math.max(0, DAILY_VIEW_LIMIT_MINUTES - dailyViewedMinutes);

  return {
    dailyViewedMinutes,
    remainingMinutes,
    isLimitReached,
    addViewTime,
    DAILY_LIMIT: DAILY_VIEW_LIMIT_MINUTES,
  };
}