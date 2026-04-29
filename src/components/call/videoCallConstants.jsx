export const YELL_AMOUNTS = [
  { value: 200, color: "green", label: "¥200" },
  { value: 500, color: "green", label: "¥500" },
  { value: 1000, color: "yellow", label: "¥1,000" },
  { value: 3000, color: "orange", label: "¥3,000" },
  { value: 5000, color: "orange", label: "¥5,000" },
  { value: 10000, color: "red", label: "¥10,000" },
];

export const colorStyles = {
  green: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
  yellow: "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
  orange: "bg-orange-500/20 border-orange-500/50 text-orange-400",
  red: "bg-red-500/20 border-red-500/50 text-red-400",
};

export const EMOJIS = ["😊","😂","🥺","❤️","🔥","👏","💪","🎉","😎","🙏","👍","✨","😍","🤩","💯","🫶","😆","🥳","😘","💫"];

export const THROW_MARKS = [
  { emoji: "🌹", label: "バラ" },
  { emoji: "⭐", label: "スター" },
  { emoji: "🎁", label: "プレゼント" },
  { emoji: "🪄", label: "魔法" },
  { emoji: "🦋", label: "蝶々" },
  { emoji: "💎", label: "ダイヤ" },
  { emoji: "🍀", label: "四葉" },
  { emoji: "🎵", label: "音符" },
];

export const FILTERS = [
  { id: "none", label: "なし", style: "" },
  { id: "beauty", label: "美肌", style: "brightness(1.1) contrast(0.9) saturate(1.1)" },
  { id: "vivid", label: "ビビッド", style: "saturate(1.5) contrast(1.1)" },
  { id: "cool", label: "クール", style: "hue-rotate(30deg) saturate(0.9)" },
  { id: "warm", label: "温かみ", style: "sepia(0.3) saturate(1.2)" },
  { id: "mono", label: "モノクロ", style: "grayscale(1)" },
  { id: "blur-bg", label: "ぼかし", style: "blur(0px)" },
];

export const BACKGROUNDS = [
  { id: "none", label: "なし", preview: null },
  { id: "blur", label: "ぼかし", preview: "blur" },
  { id: "office", label: "オフィス", preview: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80" },
  { id: "cafe", label: "カフェ", preview: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80" },
  { id: "nature", label: "自然", preview: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80" },
  { id: "studio", label: "スタジオ", preview: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80" },
];

export const AUDIO_QUALITY = [
  { id: "low", label: "低品質（省データ）" },
  { id: "medium", label: "標準" },
  { id: "high", label: "高品質" },
];

export const VIDEO_QUALITY = [
  { id: "360p", label: "360p（省データ）" },
  { id: "480p", label: "480p（標準）" },
  { id: "720p", label: "720p（HD）" },
  { id: "1080p", label: "1080p（フルHD）" },
];