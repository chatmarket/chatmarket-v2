/**
 * ActiveCreatorsSection — 各LPにカテゴリ別の実際の配信者カードを表示する共通コンポーネント
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Star, Users } from "lucide-react";

/**
 * @param {object} props
 * @param {string} props.serviceCategory - channel.service_category の値 (例: "fortune_telling")
 * @param {string} props.title           - セクション見出し
 * @param {string} props.accentColor     - アクセントカラー (CSS文字列)
 * @param {"dark"|"light"} props.theme   - カードの背景テーマ
 * @param {string} [props.emptyMessage]  - 0件時のメッセージ
 */
export default function ActiveCreatorsSection({
  serviceCategory,
  title = "活躍中の配信者",
  accentColor = "#10b981",
  theme = "dark",
  emptyMessage,
}) {
  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["lp-active-creators", serviceCategory],
    queryFn: async () => {
      // service_category でフィルタ、新着順・最大12件
      const result = await base44.entities.Channel.filter(
        { service_category: serviceCategory },
        "-updated_date",
        12
      );
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ダークテーマ用スタイル
  const isDark = theme === "dark";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const cardBorder = isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const textPrimary = isDark ? "#fff" : "#1e293b";
  const textSecondary = isDark ? "rgba(255,255,255,0.55)" : "#64748b";
  const tagBg = isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9";
  const tagColor = isDark ? "rgba(255,255,255,0.65)" : "#475569";

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (channels.length === 0) {
    if (emptyMessage === null) return null;
    return null; // 0件のときは非表示（募集中感を壊さないため）
  }

  return (
    <div className="space-y-8">
      {/* タイトル */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Users className="w-5 h-5" style={{ color: accentColor }} />
          <h2 className="text-2xl sm:text-3xl font-black" style={{ color: textPrimary }}>{title}</h2>
        </div>
        <p className="text-sm" style={{ color: textSecondary }}>
          現在このカテゴリで活動中の配信者 {channels.length}名
        </p>
      </div>

      {/* カードグリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map((ch, i) => (
          <CreatorCard
            key={ch.id}
            channel={ch}
            index={i}
            accentColor={accentColor}
            cardBg={cardBg}
            cardBorder={cardBorder}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            tagBg={tagBg}
            tagColor={tagColor}
          />
        ))}
      </div>
    </div>
  );
}

function CreatorCard({ channel, index, accentColor, cardBg, cardBorder, textPrimary, textSecondary, tagBg, tagColor }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.07, 0.4) }}
      className="rounded-2xl overflow-hidden"
      style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
    >
      {/* アバター＋ヘッダー */}
      <div className="relative h-20 flex items-center px-4 gap-3"
        style={{ background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)` }}>
        {/* ライブバッジ */}
        {channel.is_live && (
          <span className="absolute top-2 right-2 text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />LIVE
          </span>
        )}
        {/* 通話バッジ */}
        {!channel.is_live && channel.call_enabled && (
          <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${accentColor}25`, color: accentColor, border: `1px solid ${accentColor}50` }}>
            📞 通話受付中
          </span>
        )}

        {/* アバター */}
        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2"
          style={{ borderColor: `${accentColor}60` }}>
          {channel.avatar_url ? (
            <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-black"
              style={{ background: `${accentColor}20`, color: accentColor }}>
              {channel.name?.[0] || "?"}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-black text-sm leading-tight truncate" style={{ color: textPrimary }}>
            {channel.name}
          </p>
          {channel.call_theme && (
            <p className="text-[11px] leading-snug line-clamp-1 mt-0.5" style={{ color: textSecondary }}>
              {channel.call_theme}
            </p>
          )}
        </div>
      </div>

      {/* 本文 */}
      <div className="px-4 py-3 space-y-2.5">
        {/* 説明文 */}
        {channel.description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: textSecondary }}>
            {channel.description}
          </p>
        )}

        {/* タグ */}
        {(channel.tags || []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {channel.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: tagBg, color: tagColor }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* 評価 */}
        {channel.avg_rating > 0 && (
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-bold" style={{ color: textPrimary }}>{channel.avg_rating.toFixed(1)}</span>
            {channel.review_count > 0 && (
              <span className="text-[10px]" style={{ color: textSecondary }}>({channel.review_count}件)</span>
            )}
          </div>
        )}

        {/* CTAボタン */}
        <Link to={`/channel/${channel.id}`}>
          <button
            className="w-full py-2 rounded-xl text-xs font-black transition-all hover:opacity-90 mt-1"
            style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}
          >
            プロフィールを見る →
          </button>
        </Link>
      </div>
    </motion.div>
  );
}