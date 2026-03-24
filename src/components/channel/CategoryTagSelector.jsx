import React, { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { ChevronDown, ChevronUp, X, Plus } from "lucide-react";

export default function CategoryTagSelector({ value = [], onChange }) {
  const [openCat, setOpenCat] = useState(null);
  const [customTag, setCustomTag] = useState("");

  const toggleTag = (tag) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else if (value.length < 10) {
      onChange([...value, tag]);
    }
  };

  const addCustom = () => {
    const t = customTag.trim();
    if (t && !value.includes(t) && value.length < 10) {
      onChange([...value, t]);
      setCustomTag("");
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected tags */}
      <div className="flex flex-wrap gap-2 min-h-[2rem]">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full"
          >
            {tag}
            <button onClick={() => toggleTag(tag)}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span className="text-xs text-muted-foreground">タグを選択してください（最大10個）</span>
        )}
      </div>

      {/* Category list */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className={`rounded-xl border overflow-hidden ${cat.color}`}>
            <button
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
              onClick={() => setOpenCat(openCat === cat.id ? null : cat.id)}
            >
              <span className="text-base">{cat.emoji}</span>
              <span className="font-semibold text-sm flex-1">{cat.label}</span>
              {openCat === cat.id ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            {openCat === cat.id && (
              <div className="px-4 pb-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-2">
                {cat.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      value.includes(tag)
                        ? "bg-primary text-primary-foreground border-primary font-bold"
                        : "bg-background/30 border-white/20 hover:border-primary/50"
                    }`}
                  >
                    {value.includes(tag) ? "✓ " : ""}{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Custom tag input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value.slice(0, 20))}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="カスタムタグを追加..."
          className="flex-1 rounded-lg bg-secondary px-3 py-1.5 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <button
          onClick={addCustom}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> 追加
        </button>
      </div>
    </div>
  );
}