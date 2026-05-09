/**
 * MusicianProfileBadge - Musician ロール識別用アイコン
 */
import React from "react";
import { Music, Mic2, Guitar } from "lucide-react";

const MUSICIAN_ICONS = [
  { icon: Music, label: "音楽", color: "text-purple-400" },
  { icon: Mic2, label: "ボーカル", color: "text-pink-400" },
  { icon: Guitar, label: "ギター", color: "text-amber-400" },
];

export default function MusicianProfileBadge({ isMusicianRole = false, size = "md" }) {
  if (!isMusicianRole) return null;

  const iconClass = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }[size];

  const badgeClass = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  }[size];

  const Icon = MUSICIAN_ICONS[0].icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${badgeClass}`}
      style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.2))",
        borderColor: "rgba(168,85,247,0.4)",
        color: "#c084fc",
      }}
    >
      <Icon className={iconClass} />
      <span>Musician</span>
    </div>
  );
}