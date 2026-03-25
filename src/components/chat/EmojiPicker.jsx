import React, { useState } from "react";

const EMOJI_CATEGORIES = [
  {
    label: "よく使う",
    icon: "⭐",
    emojis: ["😊","😂","🥰","😍","🤩","😎","🥳","🎉","👏","🙌","💪","✨","🔥","💯","❤️","💕","🫶","👍","🤝","🙏"],
  },
  {
    label: "表情",
    icon: "😀",
    emojis: ["😀","😁","😃","😄","😅","😆","😇","🤣","😉","😋","😌","😜","🤪","😏","🤔","🤗","🥺","😢","😭","😤","😠","🤯","😱","🤫","🤭","😶","😐","😑","🙄","😒"],
  },
  {
    label: "ジェスチャー",
    icon: "👋",
    emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","👈","👉","☝️","👆","🫵","👇","💅","🤙","👍","👎","✊","👊","🤛","🤜","👐","🤲","🫂","💪"],
  },
  {
    label: "動物",
    icon: "🐱",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐙","🦋","🐝","🌸","🌺","🍀"],
  },
  {
    label: "食べ物",
    icon: "🍕",
    emojis: ["🍕","🍔","🌮","🍜","🍣","🍱","🍩","🎂","🍰","☕","🧋","🍺","🍾","🥂","🎊","🎁","🎈","🌟","⚡","💎"],
  },
  {
    label: "モーション",
    icon: "🎬",
    emojis: ["(拍手)", "(ハート)", "(花火)", "(虹)", "(応援)", "(ありがとう)", "(すごい)", "(最高)", "(がんばれ)", "(おめでとう)"],
    isMotion: true,
  },
];

const MOTION_DISPLAY = {
  "(拍手)": "👏👏👏",
  "(ハート)": "❤️💕❤️",
  "(花火)": "🎆🎇🎆",
  "(虹)": "🌈✨🌈",
  "(応援)": "📣🔥📣",
  "(ありがとう)": "🙏✨🙏",
  "(すごい)": "🤩💯🤩",
  "(最高)": "🏆🌟🏆",
  "(がんばれ)": "💪🔥💪",
  "(おめでとう)": "🎉🎊🎉",
};

export { MOTION_DISPLAY };

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="absolute bottom-12 left-0 z-50 bg-card border border-border rounded-2xl shadow-2xl w-72 overflow-hidden">
      {/* Category tabs */}
      <div className="flex border-b border-border/50 overflow-x-auto scrollbar-none">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={i}
            onClick={() => setActiveCategory(i)}
            className={`px-3 py-2 text-base shrink-0 transition-colors ${
              activeCategory === i ? "bg-primary/20 border-b-2 border-primary" : "hover:bg-secondary"
            }`}
            title={cat.label}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 h-44 overflow-y-auto">
        <p className="text-xs text-muted-foreground mb-2 px-1">{EMOJI_CATEGORIES[activeCategory].label}</p>
        <div className="grid grid-cols-6 gap-0.5">
          {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji, i) => {
            const isMotion = EMOJI_CATEGORIES[activeCategory].isMotion;
            const displayValue = isMotion ? (MOTION_DISPLAY[emoji] || emoji) : emoji;
            return (
              <button
                key={i}
                onClick={() => { onSelect(displayValue); onClose(); }}
                className={`rounded-lg hover:bg-secondary transition-colors text-center p-1 ${
                  isMotion ? "col-span-3 text-base" : "text-xl"
                }`}
                title={isMotion ? emoji : undefined}
              >
                {isMotion ? (
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="text-lg">{displayValue}</span>
                    <span className="text-[9px] text-muted-foreground">{emoji}</span>
                  </span>
                ) : emoji}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}