// PDFマインドマップに基づく業種カテゴリ定義

export const CATEGORIES = [
  {
    id: "dining",
    label: "飲食",
    color: "from-red-500/20 to-red-600/10 border-red-500/30",
    badgeColor: "bg-red-500/20 text-red-300",
    emoji: "🍽️",
    tags: ["キャバクラ", "スナック", "パブ", "ホストクラブ", "飲食店"],
  },
  {
    id: "hobby",
    label: "趣味",
    color: "from-green-500/20 to-green-600/10 border-green-500/30",
    badgeColor: "bg-green-500/20 text-green-300",
    emoji: "🎯",
    tags: ["音楽", "絵画", "カメラ", "釣り", "旅行", "擬似旅行", "ドライブ実況", "旅先紹介"],
  },
  {
    id: "game",
    label: "ゲーム・ギャンブル",
    color: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    badgeColor: "bg-purple-500/20 text-purple-300",
    emoji: "🎮",
    tags: ["ゲーム", "攻略解説", "囲碁", "将棋", "ギャンブル", "対局"],
  },
  {
    id: "chat",
    label: "雑談",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    badgeColor: "bg-blue-500/20 text-blue-300",
    emoji: "💬",
    tags: ["雑談", "お喋り", "フリートーク"],
  },
  {
    id: "consulting",
    label: "相談・カウンセリング",
    color: "from-teal-500/20 to-teal-600/10 border-teal-500/30",
    badgeColor: "bg-teal-500/20 text-teal-300",
    emoji: "🩺",
    tags: ["カウンセラー", "医療", "病院", "オンライン診療", "法律", "メンタル", "不動産", "人生相談", "保険"],
  },
  {
    id: "skill",
    label: "スキル・専門",
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    badgeColor: "bg-amber-500/20 text-amber-300",
    emoji: "🔧",
    tags: ["スキルマーケット", "占い", "各種スキル", "コンサルティング", "経営", "分析"],
  },
  {
    id: "education",
    label: "教育・学習",
    color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    badgeColor: "bg-cyan-500/20 text-cyan-300",
    emoji: "📚",
    tags: ["学習", "個人塾", "語学", "英会話", "外国語", "料理レシピ", "育児", "学校", "ビジネススクール", "塾", "教育指導"],
  },
  {
    id: "shopping",
    label: "物販・ショッピング",
    color: "from-pink-500/20 to-pink-600/10 border-pink-500/30",
    badgeColor: "bg-pink-500/20 text-pink-300",
    emoji: "🛍️",
    tags: ["家具", "家電", "車", "時計", "賃貸住宅", "高級品", "営業職", "オンライン決済"],
  },
  {
    id: "sports",
    label: "スポーツ・フィットネス",
    color: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
    badgeColor: "bg-orange-500/20 text-orange-300",
    emoji: "💪",
    tags: ["フィットネス", "試合観戦", "スポーツ", "トレーニング"],
  },
  {
    id: "entertainment",
    label: "エンターテイメント",
    color: "from-rose-500/20 to-rose-600/10 border-rose-500/30",
    badgeColor: "bg-rose-500/20 text-rose-300",
    emoji: "🎭",
    tags: ["お笑い", "怪談", "マジック", "都市伝説", "音楽", "放送局", "映画", "ドラマ"],
  },
  {
    id: "business",
    label: "ビジネス・企業",
    color: "from-slate-500/20 to-slate-600/10 border-slate-500/30",
    badgeColor: "bg-slate-500/20 text-slate-300",
    emoji: "💼",
    tags: ["アンケート", "インタビュー", "求人広告", "即面接", "セミナー", "講演", "マッチングサービス"],
  },
  {
    id: "purchase",
    label: "買取・オークション",
    color: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/30",
    badgeColor: "bg-yellow-500/20 text-yellow-300",
    emoji: "🏷️",
    tags: ["買取業者", "事前見積もり", "自動車", "バイク", "貴金属", "オークション"],
  },
  {
    id: "construction",
    label: "建築・修理・工事",
    color: "from-stone-500/20 to-stone-600/10 border-stone-500/30",
    badgeColor: "bg-stone-500/20 text-stone-300",
    emoji: "🏗️",
    tags: ["建築", "インフラ", "事前調査", "見積もり", "修理", "工事", "リフォーム"],
  },
  {
    id: "elderly",
    label: "お年寄り・介護",
    color: "from-lime-500/20 to-lime-600/10 border-lime-500/30",
    badgeColor: "bg-lime-500/20 text-lime-300",
    emoji: "👴",
    tags: ["お年寄りの話し相手", "介護", "福祉"],
  },
  {
    id: "public",
    label: "役所・公共機関",
    color: "from-indigo-500/20 to-indigo-600/10 border-indigo-500/30",
    badgeColor: "bg-indigo-500/20 text-indigo-300",
    emoji: "🏛️",
    tags: ["役所", "公共機関", "救急", "行政"],
  },
  {
    id: "matchmaking",
    label: "婚活・マッチング",
    color: "from-fuchsia-500/20 to-fuchsia-600/10 border-fuchsia-500/30",
    badgeColor: "bg-fuchsia-500/20 text-fuchsia-300",
    emoji: "💕",
    tags: ["婚活サイト", "マッチング", "出会い"],
  },
  {
    id: "farming",
    label: "農家・一次産業",
    color: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    badgeColor: "bg-emerald-500/20 text-emerald-300",
    emoji: "🌾",
    tags: ["農家", "農業", "市場", "買い物代行"],
  },
  {
    id: "politics",
    label: "政治活動",
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    badgeColor: "bg-violet-500/20 text-violet-300",
    emoji: "🗳️",
    tags: ["政治活動", "資金パーティー", "選挙"],
  },
];

export function getCategoryById(id) {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryByTag(tag) {
  return CATEGORIES.find((c) => c.tags.some((t) => t.includes(tag) || tag.includes(t)));
}

// チャンネルの業種タグからカテゴリを推定
export function inferCategory(tags = []) {
  if (!tags.length) return null;
  for (const tag of tags) {
    const cat = getCategoryByTag(tag);
    if (cat) return cat;
  }
  return null;
}