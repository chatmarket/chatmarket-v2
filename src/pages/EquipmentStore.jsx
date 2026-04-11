import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Mic, Camera, Lightbulb, Sliders, Users, ShoppingBag } from "lucide-react";

const CATEGORY_ICONS = {
  マイク: Mic,
  カメラ: Camera,
  照明: Lightbulb,
  ミキサー: Sliders,
  その他: ShoppingBag,
};

const CATEGORY_COLORS = {
  マイク: "bg-blue-500/20 text-blue-400",
  カメラ: "bg-red-500/20 text-red-400",
  照明: "bg-yellow-500/20 text-yellow-400",
  ミキサー: "bg-purple-500/20 text-purple-400",
  その他: "bg-zinc-500/20 text-zinc-400",
};

const TIERS = [
  {
    level: "Tier 1",
    title: "駆け出しクリエイター向け",
    subtitle: "最低限＆コスパ最強",
    color: "from-primary/20 to-primary/5 border-primary/30",
    badge: "bg-primary/20 text-primary",
    dot: "bg-primary",
    products: [
      {
        category: "マイク",
        name: "Audio-Technica AT2020USB+",
        reason: "USBで繋ぐだけ。ドライバ不要で即使えるコンデンサーマイク。とりあえずこれを買えば間違いなし！",
        url: "https://www.amazon.co.jp/s?k=AT2020USB",
      },
      {
        category: "カメラ",
        name: "Logicool C920n HDウェブカメラ",
        reason: "1080p対応で価格帯最強。ほとんどのPCでプラグ＆プレイ。初配信にピッタリ。",
        url: "https://www.amazon.co.jp/s?k=C920n",
      },
      {
        category: "照明",
        name: "Elgato Key Light Mini",
        reason: "顔に均一な光を当てるリングライト。暗い部屋でも一気にプロっぽく見える。",
        url: "https://www.amazon.co.jp/s?k=Elgato+Key+Light+Mini",
      },
      {
        category: "その他",
        name: "マイクアーム（汎用）",
        reason: "デスクに固定してマイクを口元に近づける。音質が劇的に改善するコスパ最強アクセサリ。",
        url: "https://www.amazon.co.jp/s?k=%E3%83%9E%E3%82%A4%E3%82%AF%E3%82%A2%E3%83%BC%E3%83%A0",
      },
    ],
  },
  {
    level: "Tier 2",
    title: "本格派ライバー向け",
    subtitle: "脱・素人機材で高音質・高画質へ",
    color: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
    badge: "bg-blue-500/20 text-blue-400",
    dot: "bg-blue-400",
    products: [
      {
        category: "マイク",
        name: "Shure SM7dB",
        reason: "YouTuberやポッドキャスターが愛用するダイナミックマイク。声の質感が圧倒的に変わる。",
        url: "https://www.amazon.co.jp/s?k=Shure+SM7dB",
      },
      {
        category: "カメラ",
        name: "Sony ZV-E10 ミラーレス",
        reason: "ボケ感と画質でウェブカメラを圧倒。外部マイク端子つきで音声も安心。",
        url: "https://www.amazon.co.jp/s?k=Sony+ZV-E10",
      },
      {
        category: "ミキサー",
        name: "Focusrite Scarlett Solo",
        reason: "コンデンサーマイクをPCに繋ぐための定番オーディオインターフェース。音の入口を本格化。",
        url: "https://www.amazon.co.jp/s?k=Focusrite+Scarlett+Solo",
      },
      {
        category: "照明",
        name: "Elgato Key Light（デスク用）",
        reason: "スマホアプリで色温度・輝度を調整できるプロ向けパネルライト。顔の映り方が段違い。",
        url: "https://www.amazon.co.jp/s?k=Elgato+Key+Light",
      },
    ],
  },
  {
    level: "Tier 3",
    title: "プロ・音楽ライブ向け",
    subtitle: "本格的な多カメラ・多音声システム",
    color: "from-purple-500/20 to-purple-600/5 border-purple-500/30",
    badge: "bg-purple-500/20 text-purple-400",
    dot: "bg-purple-400",
    products: [
      {
        category: "ミキサー",
        name: "Yamaha AG06MK2",
        reason: "ギターや楽器を繋げる6chミキサー。音楽ライブ・弾き語り配信の定番中の定番。",
        url: "https://www.amazon.co.jp/s?k=Yamaha+AG06MK2",
      },
      {
        category: "カメラ",
        name: "Blackmagic Pocket Cinema Camera",
        reason: "シネマルックで最高峰の映像美を配信。OBSとの連携も完璧なプロ機材。",
        url: "https://www.amazon.co.jp/s?k=Blackmagic+Pocket+Cinema",
      },
      {
        category: "その他",
        name: "Elgato Stream Deck MK.2",
        reason: "ワンボタンでシーン切り替え・音量調整・配信開始。操作性が別次元になる必須ツール。",
        url: "https://www.amazon.co.jp/s?k=Elgato+Stream+Deck",
      },
      {
        category: "マイク",
        name: "Shure BETA 87A",
        reason: "音楽ライブ向けのスーパーカーディオイド。ステージでも圧倒的な存在感を放つ。",
        url: "https://www.amazon.co.jp/s?k=Shure+BETA+87A",
      },
    ],
  },
];

function ProductCard({ product }) {
  const CatIcon = CATEGORY_ICONS[product.category] || ShoppingBag;
  const catColor = CATEGORY_COLORS[product.category] || CATEGORY_COLORS["その他"];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all group flex flex-col">
      {/* Image placeholder */}
      <div className="aspect-square bg-zinc-800 flex items-center justify-center relative overflow-hidden">
        <CatIcon className="w-14 h-14 text-zinc-600 group-hover:text-zinc-500 transition-colors" />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-700/0 to-zinc-900/40" />
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Category badge */}
        <span className={`self-start inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${catColor}`}>
          <CatIcon className="w-3 h-3" />{product.category}
        </span>

        {/* Name */}
        <h3 className="font-black text-white text-sm leading-snug">{product.name}</h3>

        {/* Reason */}
        <p className="text-zinc-500 text-xs leading-relaxed flex-1">{product.reason}</p>

        {/* Button */}
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-black transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Amazonで見る
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>
    </div>
  );
}

function CommunityBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 px-6 py-8 text-center space-y-4 my-10">
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 50%, #10b981 0%, transparent 50%)" }} />
      <div className="relative z-10 space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-black text-white">機材選びに迷ったら？<br />クリエイター掲示板で相談しよう！</h2>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-lg mx-auto">
          OBSの設定でつまずいた、どのマイクが自分の声に合うか知りたいなど、<br className="hidden sm:block" />
          先輩クリエイターに質問してみましょう。
        </p>
        <Link
          to="/forum"
          className="inline-flex items-center gap-2 border border-primary text-primary hover:bg-primary/10 font-bold text-sm px-6 py-2.5 rounded-xl transition-colors"
        >
          <Users className="w-4 h-4" /> 掲示板を見る・質問する
        </Link>
      </div>
    </div>
  );
}

export default function EquipmentStore() {
  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative overflow-hidden bg-zinc-950 border-b border-zinc-800 px-4 py-14 text-center">
        <div className="absolute inset-0 opacity-5 flex items-center justify-center gap-16 text-white pointer-events-none" style={{ fontSize: "180px" }}>
          🎙️📷
        </div>
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-2xl mx-auto space-y-3">
          <span className="inline-block text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 border border-primary/30 px-3 py-1 rounded-full">
            推奨機材ガイド
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-white">ChatMarket 配信機材ガイド</h1>
          <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
            スマホ配信からプロのステージまで。<br />あなたの成長を支える推奨機材リスト
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-4">
        {TIERS.map((tier, i) => (
          <React.Fragment key={tier.level}>
            {/* Community banner between Tier 1 and Tier 2 */}
            {i === 1 && <CommunityBanner />}

            {/* Tier section */}
            <section className={`rounded-2xl border bg-gradient-to-br ${tier.color} p-6 space-y-5`}>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${tier.badge}`}>{tier.level}</span>
                <div>
                  <h2 className="text-lg font-black text-white">{tier.title}</h2>
                  <p className="text-xs text-zinc-500">{tier.subtitle}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {tier.products.map((p) => (
                  <ProductCard key={p.name} product={p} />
                ))}
              </div>
            </section>
          </React.Fragment>
        ))}

        {/* Footer note */}
        <p className="text-center text-xs text-zinc-600 pt-4 pb-8">
          ※ 掲載商品はアフィリエイトリンクを含む場合があります。価格・在庫はAmazonでご確認ください。
        </p>
      </div>
    </div>
  );
}