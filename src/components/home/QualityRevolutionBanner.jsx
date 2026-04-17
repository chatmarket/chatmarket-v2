/**
 * QualityRevolutionBanner
 * 「55円革命」— 価格帯×画質を視覚的に驚かせるインパクトバナー
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Star, Crown, ChevronRight } from "lucide-react";

const TIERS = [
  {
    label: "SD",
    price: "15円〜",
    quality: "480p",
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.08)",
    border: "rgba(156,163,175,0.25)",
    icon: "📺",
    desc: "入門・体験向け",
    wow: null,
  },
  {
    label: "HD",
    price: "55円〜",
    quality: "720p",
    color: "#00d4ff",
    bg: "rgba(0,212,255,0.10)",
    border: "rgba(0,212,255,0.50)",
    icon: "⭐",
    desc: "YouTube並みの高画質",
    wow: "← これが革命",
    wowColor: "#00d4ff",
  },
  {
    label: "FHD",
    price: "150円〜",
    quality: "1080p",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.35)",
    icon: "👑",
    desc: "プロ品質・最高峰",
    wow: null,
  },
];

export default function QualityRevolutionBanner() {
  const [hovered, setHovered] = useState(1); // default: HD selected

  return (
    <div
      className="rounded-2xl overflow-hidden p-5 space-y-5"
      style={{
        background: "linear-gradient(135deg, #0a0e18 0%, #0a1628 50%, #0d1117 100%)",
        border: "1px solid rgba(0,212,255,0.25)",
        boxShadow: "0 0 40px rgba(0,212,255,0.08)",
      }}
    >
      {/* ヘッダー */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <p className="text-[11px] font-black text-cyan-400 uppercase tracking-widest">15円革命</p>
          <Zap className="w-4 h-4 text-cyan-400" />
        </div>
        <p className="text-base sm:text-lg font-black text-white leading-tight">
          「配信者が15円から自由に値付けできる」<br />
          <span className="text-cyan-400">— それが ChatMarket の答えです。</span>
        </p>
        <p className="text-xs text-white/40 leading-relaxed">
          ストア手数料ゼロのPWA直営だから実現した、業界破壊的な価格×画質の組み合わせ。
        </p>
      </div>

      {/* 価格帯カード */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {TIERS.map((tier, i) => (
          <button
            key={tier.label}
            onMouseEnter={() => setHovered(i)}
            onClick={() => setHovered(i)}
            className="relative rounded-xl p-3 sm:p-4 space-y-2 text-left transition-all duration-200"
            style={{
              background: hovered === i ? tier.bg : "rgba(255,255,255,0.02)",
              border: `2px solid ${hovered === i ? tier.border : "rgba(255,255,255,0.06)"}`,
              transform: hovered === i ? "scale(1.03)" : "scale(1)",
              boxShadow: hovered === i ? `0 0 20px ${tier.color}30` : "none",
            }}
          >
            {/* WOWバッジ */}
            {tier.wow && hovered === i && (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: tier.color, color: "#000" }}
              >
                {tier.wow}
              </div>
            )}

            <div className="text-xl sm:text-2xl">{tier.icon}</div>
            <div>
              <p className="text-[10px] sm:text-xs text-white/40">{tier.quality}</p>
              <p className="text-lg sm:text-2xl font-black" style={{ color: tier.color }}>
                {tier.price}
              </p>
              <p className="text-[10px] font-bold" style={{ color: tier.color + "99" }}>
                {tier.label}
              </p>
            </div>
            <p className="text-[9px] sm:text-[10px] text-white/40 leading-tight">{tier.desc}</p>
          </button>
        ))}
      </div>

      {/* 比較インサイト */}
      <div
        className="rounded-xl px-4 py-3 space-y-1"
        style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)" }}
      >
        <p className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5" /> 最低視聴料15円〜配信者が自由に価格設定しスタート
        </p>
        <p className="text-[10px] text-white/40 leading-relaxed">
          Apple・Googleのストア経由なら同じ画質でも配信者の手取りは最大30%カット。<br />
          ChatMarketはPWA直営で手数料ゼロ。だから安くても高品質が成立します。
        </p>
      </div>

      {/* CTA */}
      <Link to="/plan-select">
        <div
          className="flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-opacity hover:opacity-80"
          style={{ background: "rgba(0,212,255,0.12)", color: "#00d4ff", border: "1px solid rgba(0,212,255,0.35)" }}
        >
          <Crown className="w-4 h-4" />
          15円から配信を始める
          <ChevronRight className="w-4 h-4" />
        </div>
      </Link>
    </div>
  );
}