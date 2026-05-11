import React from "react";
import { Star, Crown, Gem, Check } from "lucide-react";
import FanclubSubscribeButton from "./FanclubSubscribeButton";

const TIER_CONFIG = {
  standard: {
    icon: Star,
    color: "from-zinc-400/20 to-zinc-600/10",
    border: "border-zinc-500/40",
    textColor: "text-zinc-300",
    badgeColor: "bg-zinc-500/80",
    badge: "Standard",
    emoji: "⭐",
  },
  premium: {
    icon: Crown,
    color: "from-blue-500/20 to-blue-700/10",
    border: "border-blue-500/40",
    textColor: "text-blue-300",
    badgeColor: "bg-blue-600/80",
    badge: "Premium",
    emoji: "👑",
  },
  diamond: {
    icon: Gem,
    color: "from-amber-400/20 to-yellow-600/10",
    border: "border-amber-500/40",
    textColor: "text-amber-300",
    badgeColor: "bg-amber-500/80",
    badge: "Diamond",
    emoji: "💎",
  },
};

export default function SanctumTierCard({ tier, price, perks, name, emoji, isCurrentTier, hasAnyTier, channelId, disabled }) {
  // DBから渡されたname/emojiを優先、なければTIER_CONFIGのデフォルトを使用
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.standard;
  const Icon = cfg.icon;
  const displayName = name || cfg.badge;
  const displayEmoji = emoji || cfg.emoji;

  return (
    <div className={`relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-300 ${cfg.border} ${isCurrentTier ? "shadow-lg scale-[1.02]" : "hover:scale-[1.01]"}`}
      style={{ background: `linear-gradient(160deg, ${isCurrentTier ? "rgba(255,215,0,0.04)" : "rgba(0,0,0,0)"} 0%, rgba(0,0,0,0) 100%)` }}>

      {isCurrentTier && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      )}

      <div className={`p-5 bg-gradient-to-br ${cfg.color}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full ${cfg.badgeColor} flex items-center justify-center`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className={`font-black text-sm ${cfg.textColor}`}>{displayEmoji} {displayName}</span>
          </div>
          {isCurrentTier && (
            <span className="text-[10px] bg-amber-400 text-black font-black px-2 py-0.5 rounded-full">加入中</span>
          )}
        </div>
        <p className={`text-3xl font-black ${cfg.textColor}`}>
          ¥{price.toLocaleString()}
          <span className="text-sm font-normal text-muted-foreground ml-1">/月</span>
        </p>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        <ul className="space-y-2.5 flex-1">
          {perks.map((perk, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm">
              <Check className={`w-4 h-4 shrink-0 mt-0.5 ${cfg.textColor}`} />
              <span className="text-foreground/80 leading-snug">{perk}</span>
            </li>
          ))}
        </ul>

        <FanclubSubscribeButton
          tier={tier}
          channelId={channelId}
          isCurrentTier={isCurrentTier}
          hasAnyTier={hasAnyTier}
          disabled={disabled}
        />
      </div>
    </div>
  );
}