import React from "react";
import { Link } from "react-router-dom";
import { Radio, ExternalLink } from "lucide-react";

const TIERS = [
  {
    quality: "SD 480p",
    icon: "📺",
    minPrice: "¥150〜",
    note: "720pまで",
    color: "border-gray-500/40 bg-gray-500/10",
    labelColor: "text-gray-300",
  },
  {
    quality: "HD 720p",
    icon: "🖥️",
    minPrice: "¥300〜",
    note: "1080pまで",
    color: "border-blue-500/40 bg-blue-500/10",
    labelColor: "text-blue-300",
  },
  {
    quality: "FHD 1080p",
    icon: "✨",
    minPrice: "¥1,500〜",
    note: "フルHD",
    color: "border-primary/40 bg-primary/10",
    labelColor: "text-primary",
  },
];

export default function PpvPricingTable() {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
        <h2 className="text-xl font-bold">1対多数 有料ライブ配信（PPV）料金</h2>
        <span className="text-xs bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-semibold">PPVプラン</span>
      </div>

      <div className="rounded-2xl border border-red-500/20 overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-red-500/10 px-4 py-3 text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-2">
          <Radio className="w-4 h-4" />
          視聴者1人あたり・15分ごとの料金（配信者が自由設定）
        </div>

        {/* 料金テーブル */}
        <div className="divide-y divide-border/30">
          {TIERS.map((tier) => (
            <div key={tier.quality} className="flex items-center gap-4 px-4 py-4">
              <span className="text-2xl shrink-0">{tier.icon}</span>
              <div className="flex-1">
                <p className={`font-black text-sm ${tier.labelColor}`}>{tier.quality}</p>
                <p className="text-xs text-muted-foreground">{tier.note}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-base text-primary">{tier.minPrice}</p>
                <p className="text-[10px] text-muted-foreground">15分/人</p>
              </div>
            </div>
          ))}
        </div>

        {/* 補足 */}
        <div className="bg-secondary/40 px-4 py-4 space-y-2 text-xs text-muted-foreground border-t border-border/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <p>📌 収益還元率 <span className="text-primary font-bold">85%</span>（月間売上に応じて最大95%まで自動アップ）</p>
            <p>📌 150円設定 → 最大720p ／ 300円以上 → 最大1080p許可</p>
            <p>📌 コスト：場所代30円/時間 ＋ 送料5円/視聴者/時間</p>
            <p>📌 音楽利用（歌唱・BGM等）はJASRAC包括契約対応</p>
          </div>
          <div className="pt-2 border-t border-border/20 flex items-center justify-between">
            <p className="text-[11px]">※ BASICプランとの組み合わせが必要です</p>
            <Link to="/plan-select" className="flex items-center gap-1 text-primary hover:underline font-bold text-xs">
              プランを見る <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}