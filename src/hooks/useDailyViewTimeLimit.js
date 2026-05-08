/**
 * 視聴時間制限は撤廃済み。
 * 後方互換のためフックのインターフェースは維持するが、制限は一切かけない。
 */
export function useDailyViewTimeLimit(userId, userPlan = "free") {
  return {
    dailyViewedMinutes: 0,
    remainingMinutes: Infinity,
    isLimitReached: false,
    addViewTime: () => {},
    DAILY_LIMIT: Infinity,
    currentPlan: userPlan,
    nextPlanLimit: Infinity,
  };
}