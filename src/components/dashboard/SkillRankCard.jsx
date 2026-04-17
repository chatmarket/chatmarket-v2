import React, { useMemo } from "react";
import { Star, TrendingUp, Award, Zap, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

// スキルランクの定義
const SKILL_RANKS = [
  { id: "intern",   label: "トレーニングモード",  labelEn: "Training Mode",   minScore: 0,   color: "#9ca3af", bg: "rgba(156,163,175,0.1)", border: "rgba(156,163,175,0.3)", icon: "🎓", desc: "あなたの旅はここから始まります。" },
  { id: "beginner", label: "スターター",          labelEn: "Starter",         minScore: 20,  color: "#00ff9d", bg: "rgba(0,255,157,0.08)", border: "rgba(0,255,157,0.3)", icon: "🌱", desc: "ファンとの信頼関係を築いています。" },
  { id: "pro",      label: "プロモード",           labelEn: "Pro Mode",        minScore: 45,  color: "#00d4ff", bg: "rgba(0,212,255,0.08)", border: "rgba(0,212,255,0.3)", icon: "⭐", desc: "本格的なスキルで市場価値が高まっています。" },
  { id: "expert",   label: "エキスパート",         labelEn: "Expert",          minScore: 70,  color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", icon: "🏆", desc: "あなたはもう企業に頼らずに生きていける力があります。" },
  { id: "master",   label: "トップクリエイター",   labelEn: "Top Creator",     minScore: 90,  color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.5)", icon: "👑", desc: "最高峰。あなたのブランドが独立した資産です。" },
];

function calcScore({ videoCalls, liveStreams, videos, purchases }) {
  let score = 0;

  // 通話回数（最大20点）
  const callCount = videoCalls.length;
  score += Math.min(20, callCount * 2);

  // 単価アップ実績: 55円以上の通話や配信があるか（最大25点）
  const hdCalls = videoCalls.filter(c => (c.coin_price_per_15min || 0) >= 55 || (c.price || 0) >= 55);
  const fhdCalls = videoCalls.filter(c => (c.coin_price_per_15min || 0) >= 150 || (c.price || 0) >= 150);
  score += Math.min(15, hdCalls.length * 3);
  score += Math.min(10, fhdCalls.length * 5);

  // アーカイブ動画数（最大25点）
  score += Math.min(25, videos.length * 5);

  // リピーター率：同じ購入者が複数回（最大20点）
  const buyerMap = {};
  purchases.forEach(p => { buyerMap[p.buyer_email] = (buyerMap[p.buyer_email] || 0) + 1; });
  const repeatBuyers = Object.values(buyerMap).filter(v => v > 1).length;
  score += Math.min(20, repeatBuyers * 5);

  // ライブ配信経験（最大10点）
  score += Math.min(10, liveStreams.length * 2);

  return Math.min(100, Math.round(score));
}

function getRank(score) {
  for (let i = SKILL_RANKS.length - 1; i >= 0; i--) {
    if (score >= SKILL_RANKS[i].minScore) return SKILL_RANKS[i];
  }
  return SKILL_RANKS[0];
}

function getNextRank(score) {
  for (let i = 0; i < SKILL_RANKS.length; i++) {
    if (score < SKILL_RANKS[i].minScore) return SKILL_RANKS[i];
  }
  return null;
}

export default function SkillRankCard({ videoCalls = [], liveStreams = [], videos = [], purchases = [] }) {
  const score = useMemo(() => calcScore({ videoCalls, liveStreams, videos, purchases }), [videoCalls, liveStreams, videos, purchases]);
  const rank = getRank(score);
  const nextRank = getNextRank(score);
  const callCount = videoCalls.length;
  const internThreshold = 5; // 5回こなしたら「卒業」判定

  const isInternGraduating = rank.id === "intern" && callCount >= internThreshold;

  return (
    <div className="rounded-2xl border-2 p-5 space-y-4"
      style={{ background: rank.bg, borderColor: rank.border }}>

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4" style={{ color: rank.color }} />
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: rank.color }}>あなたの市場価値ランク</p>
        </div>
        <span className="text-xs text-muted-foreground">{rank.labelEn}</span>
      </div>

      {/* ランク表示 */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
          style={{ background: rank.color + "20" }}>
          {rank.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-black" style={{ color: rank.color }}>{rank.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rank.desc}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-black" style={{ color: rank.color }}>{score}</p>
          <p className="text-[10px] text-muted-foreground">/ 100点</p>
        </div>
      </div>

      {/* スコアバー */}
      <div className="space-y-1">
        <div className="h-3 bg-background/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, background: `linear-gradient(90deg, ${rank.color}aa, ${rank.color})` }}
          />
        </div>
        {nextRank && (
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>現在: {rank.label}</span>
            <span>次: {nextRank.label}（あと{nextRank.minScore - score}点）</span>
          </div>
        )}
      </div>

      {/* スコア根拠 */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { label: "通話実績", value: `${callCount}回`, icon: "📞" },
          { label: "アーカイブ資産", value: `${videos.length}本`, icon: "🎬" },
          { label: "HD以上単価実績", value: `${videoCalls.filter(c => (c.price || 0) >= 55).length}回`, icon: "⭐" },
          { label: "リピーター", value: (() => { const m = {}; purchases.forEach(p => m[p.buyer_email] = (m[p.buyer_email]||0)+1); return Object.values(m).filter(v=>v>1).length + "人"; })(), icon: "❤️" },
        ].map((item, i) => (
          <div key={i} className="bg-background/40 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="text-base">{item.icon}</span>
            <div>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
              <p className="font-black text-sm" style={{ color: rank.color }}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* インターン卒業メッセージ */}
      {isInternGraduating && (
        <div className="rounded-xl p-4 space-y-2"
          style={{ background: "linear-gradient(135deg, rgba(0,255,157,0.15), rgba(0,212,255,0.1))", border: "1px solid rgba(0,255,157,0.4)" }}>
          <p className="text-sm font-black text-primary">🎓 卒業おめでとうございます！</p>
          <p className="text-xs text-primary/80 leading-relaxed">
            あなたのスキルはもう「15円（トレーニングモード）」の価値ではありません。<br />
            <strong>55円以上のプロモード</strong>へ移行して、あなたの真の市場価値を解放しましょう！
          </p>
          <Link to="/go-live" className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
            プロモードで配信を設定する <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}