import React from "react";
import { ChevronsDown } from "lucide-react";

export default function ChatAutoScrollToggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={enabled ? "自動スクロールON" : "自動スクロールOFF（クリックでON）"}
      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-all ${
        enabled
          ? "bg-primary/20 border-primary/50 text-primary"
          : "bg-zinc-800 border-zinc-600 text-zinc-400"
      }`}
    >
      <ChevronsDown className="w-3.5 h-3.5" />
      {enabled ? "自動↓" : "停止中"}
    </button>
  );
}