import React, { useMemo } from "react";
import { TrendingUp, ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";

export default function PriceUpNudgeCard({ videoCalls = [], liveStreams = [] }) {
  const nudge = useMemo(() => {
    // リピーターを計算（同じcaller_emailが2回以上）
    const callerMap = {};
    videoCalls.forEach(c => {
      callerMap[c.caller_email] = (callerMap[c.caller_email] || 0) + 1;
    });
    const repeatCallers = Object.entries(callerMap).filter(([, count]) => count >= 2);
    const repeaterCount = repeatCallers.length;

    // 現在の最低価格帯を確認（過去の通話・配信から）
    const lowPriceCalls = videoCalls.filter(c => (c.price || 0) > 0 && (c.price || 0) <= 55 * Math.ceil((c.actual_duration_minutes || 15) / 15));
    const isAtLowPrice = lowPriceCalls.length > 0;

    // SD配信のリピート確認
    const lowPriceStreams = liveStreams.filter(s => (s.price || 0) > 0 && (s.price || 0) <= 54);
    const streamRepeaters = new Set(
      videoCalls.filter(c => (c.price || 0) > 0 && c.price <= 55).map(c => c.caller_email)
    ).size;

    if (repeaterCount >= 5 && isAtLowPrice) {
      return {
        level: "strong",
        repeaterCount,
        message: `🎉 おめでとうございます！あなたには${repeaterCount}人のリピーターがいます。`,
        sub: "あなたのファンは、15円以上の価値をあなたに感じています。勇気を持って 55円（HD）にステップアップしませんか？",
        cta: "55円プロモードで次の配信を設定",
        color: "#00d4ff",
        bg: "rgba(0,212,255,0.08)",
        border: "rgba(0,212,255,0.35)",
      };
    }
    if (repeaterCount >= 2 && isAtLowPrice) {
      return {
        level: "soft",
        repeaterCount,
        message: `💙 ${repeaterCount}人のリピーターがあなたを選んでいます。`,
        sub: "繰り返し選ばれるということは、あなたのスキルに確かな価値があるということ。少しずつ単価を上げる準備を始めませんか？",
        cta: "価格設定を見直す",
        color: "#00ff9d",
        bg: "rgba(0,255,157,0.06)",
        border: "rgba(0,255,157,0.25)",
      };
    }
    return null;
  }, [videoCalls, liveStreams]);

  if (!nudge) return null;

  return (
    <div className="rounded-2xl border-2 p-5 space-y-4"
      style={{ background: nudge.bg, borderColor: nudge.border }}>

      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4" style={{ color: nudge.color }} />
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: nudge.color }}>
          価格アップの背中押し
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-black text-foreground">{nudge.message}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{nudge.sub}</p>
      </div>

      {/* リピーターの視覚化 */}
      <div className="flex items-center gap-1 flex-wrap">
        {Array.from({ length: Math.min(nudge.repeaterCount, 10) }).map((_, i) => (
          <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
            style={{ background: nudge.color + "20", border: `1px solid ${nudge.color}44` }}>
            <Star className="w-3.5 h-3.5" style={{ color: nudge.color }} />
          </div>
        ))}
        {nudge.repeaterCount > 10 && (
          <span className="text-xs text-muted-foreground ml-1">+{nudge.repeaterCount - 10}人</span>
        )}
      </div>

      <div className="rounded-xl px-4 py-3 text-xs font-semibold leading-relaxed"
        style={{ background: nudge.color + "12", border: `1px solid ${nudge.color}30`, color: nudge.color }}>
        💡 ファンがあなたにちゃんとお金を払いたがっています。データがそれを証明しています。
      </div>

      <Link to="/go-live">
        <div className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-80"
          style={{ background: nudge.color + "20", color: nudge.color, border: `1px solid ${nudge.color}40` }}>
          {nudge.cta} <ArrowRight className="w-4 h-4" />
        </div>
      </Link>
    </div>
  );
}