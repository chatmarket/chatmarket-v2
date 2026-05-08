import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * 引き算の美学：最初は見出しだけ → ユーザーが「？」を感じたら詳細展開
 */
export default function MinimalDetailAccordion({ title, details }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors"
      >
        <h3 className="font-bold text-sm text-left">{title}</h3>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="px-4 py-3 bg-secondary/20 border-t border-border/30 space-y-2 text-xs text-muted-foreground leading-relaxed">
          {details}
        </div>
      )}
    </div>
  );
}