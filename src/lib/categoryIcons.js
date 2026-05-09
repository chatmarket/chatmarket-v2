// 職種カテゴリ・アイコンセット
// 社長が新しい職種を追加する際はここにエントリを追加するだけでOK

export const CATEGORY_ICONS = [
  // フィットネス・健康
  { id: "fitness",        emoji: "💪", label: "フィットネス・ジム",      color: "#F5A623" },
  { id: "yoga",           emoji: "🧘", label: "ヨガ・ピラティス",         color: "#10B981" },
  { id: "diet",           emoji: "🥗", label: "ダイエット・栄養",         color: "#84CC16" },
  // 占い・スピリチュアル
  { id: "fortune",        emoji: "🔮", label: "占い・スピリチュアル",     color: "#8B5CF6" },
  // 音楽
  { id: "musician",       emoji: "🎸", label: "ミュージシャン",           color: "#EC4899" },
  { id: "dj",             emoji: "🎧", label: "DJ・音楽プロデューサー",   color: "#6366F1" },
  // 教育
  { id: "tutor",          emoji: "📚", label: "家庭教師・教育",           color: "#3B82F6" },
  { id: "language",       emoji: "🌐", label: "語学レッスン",             color: "#06B6D4" },
  // 士業・専門職
  { id: "lawyer",         emoji: "⚖️", label: "弁護士・法律",            color: "#1B2B6B" },
  { id: "tax",            emoji: "🧾", label: "税理士・会計",             color: "#0F172A" },
  { id: "scrivener",      emoji: "📜", label: "司法書士・行政書士",       color: "#374151" },
  { id: "consultant",     emoji: "💼", label: "コンサルタント・経営",     color: "#1E40AF" },
  // 料理・フード
  { id: "cooking",        emoji: "🍳", label: "料理・クッキング",         color: "#F97316" },
  { id: "patissier",      emoji: "🎂", label: "パティシエ・製菓",         color: "#FB7185" },
  { id: "barista",        emoji: "☕", label: "バリスタ・カフェ",         color: "#92400E" },
  // ペット
  { id: "pet",            emoji: "🐾", label: "ペット・動物",             color: "#F59E0B" },
  { id: "vet",            emoji: "🐕", label: "獣医・動物看護",           color: "#16A34A" },
  // 美容・ファッション
  { id: "beauty",         emoji: "💄", label: "美容・メイク",             color: "#F43F5E" },
  { id: "fashion",        emoji: "👗", label: "ファッション・スタイリスト", color: "#A855F7" },
  { id: "nail",           emoji: "💅", label: "ネイル",                   color: "#EC4899" },
  // アート・クリエイティブ
  { id: "art",            emoji: "🎨", label: "アート・イラスト",         color: "#8B5CF6" },
  { id: "photo",          emoji: "📸", label: "写真・映像",               color: "#0EA5E9" },
  { id: "design",         emoji: "✏️", label: "デザイン",                 color: "#6366F1" },
  // テック
  { id: "tech",           emoji: "💻", label: "IT・プログラミング",       color: "#14B8A6" },
  { id: "ai",             emoji: "🤖", label: "AI・データサイエンス",     color: "#0F172A" },
  // メンタル・コーチング
  { id: "coach",          emoji: "🧠", label: "コーチング・メンタル",     color: "#7C3AED" },
  { id: "therapist",      emoji: "🫶", label: "カウンセラー・セラピー",   color: "#DB2777" },
  // エンタメ・タレント
  { id: "idol",           emoji: "⭐", label: "アイドル・タレント",       color: "#F472B6" },
  { id: "comedian",       emoji: "🎭", label: "お笑い・芸人",             color: "#FBBF24" },
  { id: "gamer",          emoji: "🎮", label: "ゲーム・eスポーツ",        color: "#4F46E5" },
  // その他
  { id: "expert",         emoji: "👑", label: "有識者・講演",             color: "#B45309" },
  { id: "other",          emoji: "✨", label: "その他",                    color: "#6B7280" },
];

export function getCategoryById(id) {
  return CATEGORY_ICONS.find((c) => c.id === id) || CATEGORY_ICONS.find((c) => c.id === "other");
}