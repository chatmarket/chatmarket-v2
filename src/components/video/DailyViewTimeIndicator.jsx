import React, { useEffect, useState, useRef } from "react";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DAILY_LIMIT_MINUTES = 60;
const ALERT_THRESHOLD_MINUTES = 10; // 10分以下でアラート表示
const STORAGE_KEY = "daily_view_time";

export default function DailyViewTimeIndicator() {
  const [dailyViewedMinutes, setDailyViewedMinutes] = useState(0);
  const [remainingMinutes, setRemainingMinutes] = useState(DAILY_LIMIT_MINUTES);
  const [showAlert, setShowAlert] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const alertShownRef = useRef(false);

  // 今日の視聴時間を読み込み
  useEffect(() => {
    const loadDailyViewTime = () => {
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
    };

    const viewed = loadDailyViewTime();
    const remaining = Math.max(0, DAILY_LIMIT_MINUTES - viewed);
    
    setDailyViewedMinutes(viewed);
    setRemainingMinutes(remaining);
    setLimitReached(viewed >= DAILY_LIMIT_MINUTES);

    // 残り時間が少なくなったらアラート表示
    if (remaining <= ALERT_THRESHOLD_MINUTES && remaining > 0 && !alertShownRef.current) {
      alertShownRef.current = true;
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 8000);
    }
  }, []);

  // ポーラーで定期的に更新（ユーザーが別タブから時間を追加した場合など）
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data = JSON.parse(stored);
      const today = new Date().toISOString().split("T")[0];

      if (data.date === today) {
        const viewed = data.minutes || 0;
        const remaining = Math.max(0, DAILY_LIMIT_MINUTES - viewed);
        
        setDailyViewedMinutes(viewed);
        setRemainingMinutes(remaining);
        setLimitReached(viewed >= DAILY_LIMIT_MINUTES);

        // 新しくアラート条件に達したらアラート表示
        if (remaining <= ALERT_THRESHOLD_MINUTES && remaining > 0 && !alertShownRef.current) {
          alertShownRef.current = true;
          setShowAlert(true);
          setTimeout(() => setShowAlert(false), 8000);
        }
      }
    }, 5000); // 5秒ごとに更新

    return () => clearInterval(interval);
  }, []);

  const progressPercentage = (dailyViewedMinutes / DAILY_LIMIT_MINUTES) * 100;
  const isWarning = remainingMinutes <= ALERT_THRESHOLD_MINUTES;
  const isLimited = limitReached;

  return (
    <div className="space-y-2">
      {/* プログレスバー */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Clock className={`w-4 h-4 ${isLimited ? "text-red-500" : isWarning ? "text-yellow-500" : "text-primary"}`} />
            <span className="text-muted-foreground">本日の視聴時間</span>
          </div>
          <span className={`text-xs font-bold ${isLimited ? "text-red-500" : isWarning ? "text-yellow-500" : "text-foreground"}`}>
            {remainingMinutes}分 / {DAILY_LIMIT_MINUTES}分
          </span>
        </div>

        {/* プログレスバー本体 */}
        <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-all ${
              isLimited
                ? "bg-red-500"
                : isWarning
                ? "bg-yellow-500"
                : "bg-primary"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>

        {/* 副テキスト */}
        <p className="text-[10px] text-muted-foreground leading-tight">
          {isLimited ? (
            <span className="text-red-500 font-semibold">本日の視聴上限に達しました。明日またご利用ください。</span>
          ) : isWarning ? (
            <span className="text-yellow-500 font-semibold">残り時間が少なくなっています。計画的に視聴してください。</span>
          ) : (
            <>毎日午前0時にリセットされます。1日60分の視聴上限があります。</>
          )}
        </p>
      </div>

      {/* アラートバナー */}
      <AnimatePresence>
        {showAlert && !isLimited && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-yellow-500/15 border border-yellow-500/40 rounded-lg p-3 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
            <div className="text-xs text-yellow-700 leading-relaxed">
              <p className="font-bold">視聴時間が少なくなっています</p>
              <p>残り <span className="font-bold">{remainingMinutes}分</span> です。計画的に視聴をお楽しみください。</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 上限到達時のバナー */}
      <AnimatePresence>
        {isLimited && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/15 border border-red-500/40 rounded-lg p-3 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 leading-relaxed">
              <p className="font-bold">本日の視聴上限に達しました</p>
              <p>明日午前0時にリセットされます。</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}