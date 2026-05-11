import React from "react";

// バッジ定義 — typeをキーとして追加可能
const BADGE_CONFIG = {
  // 実績バッジ
  storecka_100: { emoji: "🏆", label: "ストアカ100件+", color: "from-amber-500/20 to-amber-600/10", border: "border-amber-500/50", text: "text-amber-300" },
  storecka_verified: { emoji: "✅", label: "ストアカ認定講師", color: "from-blue-500/20 to-blue-600/10", border: "border-blue-500/50", text: "text-blue-300" },
  // 資格・認定バッジ
  toeic_900: { emoji: "🎓", label: "TOEIC 900+", color: "from-sky-500/20 to-sky-600/10", border: "border-sky-500/50", text: "text-sky-300" },
  certified_coach: { emoji: "🎖", label: "認定コーチ", color: "from-violet-500/20 to-violet-600/10", border: "border-violet-500/50", text: "text-violet-300" },
  // 経験・実績バッジ
  years_5: { emoji: "⭐", label: "経験5年以上", color: "from-yellow-500/20 to-yellow-600/10", border: "border-yellow-500/50", text: "text-yellow-300" },
  years_10: { emoji: "🌟", label: "経験10年以上", color: "from-orange-500/20 to-orange-600/10", border: "border-orange-500/50", text: "text-orange-300" },
  // SNS・影響力バッジ
  youtube_10k: { emoji: "▶️", label: "YouTube 1万人+", color: "from-red-500/20 to-red-600/10", border: "border-red-500/50", text: "text-red-300" },
  twitter_10k: { emoji: "𝕏", label: "X 1万フォロワー+", color: "from-slate-500/20 to-slate-600/10", border: "border-slate-400/50", text: "text-slate-300" },
  // プラットフォームバッジ
  top_creator: { emoji: "👑", label: "トップクリエイター", color: "from-primary/20 to-primary/10", border: "border-primary/50", text: "text-primary" },
  verified: { emoji: "🔵", label: "本人確認済み", color: "from-blue-500/20 to-blue-600/10", border: "border-blue-500/50", text: "text-blue-300" },
};

/**
 * ProfileBadges — channelのbadges配列を受け取りバッジ一覧を表示
 * @param {string[]} badges - バッジのtypeキー配列
 * @param {boolean} compact - trueならアイコンのみ表示
 */
export default function ProfileBadges({ badges = [], compact = false }) {
  if (!badges || badges.length === 0) return null;

  const resolved = badges
    .map(b => BADGE_CONFIG[b] ? { type: b, ...BADGE_CONFIG[b] } : null)
    .filter(Boolean);

  if (resolved.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {resolved.map(b => (
          <span key={b.type} title={b.label}
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-gradient-to-r ${b.color} ${b.border} ${b.text}`}>
            {b.emoji} {b.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {resolved.map(b => (
        <div key={b.type}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-gradient-to-r text-xs font-bold ${b.color} ${b.border} ${b.text}`}>
          <span>{b.emoji}</span>
          <span>{b.label}</span>
        </div>
      ))}
    </div>
  );
}

export { BADGE_CONFIG };