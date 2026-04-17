import React from "react";
import { motion } from "framer-motion";
import { Phone, Radio, Archive, Film, ArrowRight, Users, GraduationCap, Mic, BookOpen, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const MODELS = [
  {
    id: "private-session",
    icon: Phone,
    color: "#00d4ff",
    emoji: "📞",
    titleJa: "1対1ビデオ通話",
    titleEn: "Private Session",
    descJa: "ファンとの密な交流、マンツーマンの家庭教師、個別相談など。使い方はあなた次第。",
    descEn: "Intimate fan engagement, private tutoring, personal consulting — it's your call.",
    keywordsJa: ["自分だけの時間を販売", "使い方はあなた次第"],
    keywordsEn: ["Sell your exclusive time", "Unlimited possibilities"],
    useCases: [
      { icon: GraduationCap, label: "家庭教師" },
      { icon: Users, label: "個別相談" },
      { icon: Mic, label: "ファン交流" },
    ],
    flow: ["予約受付", "ビデオ通話", "自動課金", "報酬GET"],
  },
  {
    id: "paid-live",
    icon: Radio,
    color: "#ff6b6b",
    emoji: "📡",
    titleJa: "1対多数 有料生配信",
    titleEn: "Paid Live Streaming",
    descJa: "オンライン講演会、スキル伝授、限定ライブ、セミナー。あなたのスキルで世界を楽しませる。",
    descEn: "Online lectures, skill sharing, exclusive live events. Entertain the world with your talent.",
    keywordsJa: ["あなたのスキルで世界を楽しませる", "チケット制配信"],
    keywordsEn: ["Entertain the world", "Ticket-based streaming"],
    useCases: [
      { icon: Mic, label: "講演会" },
      { icon: Sparkles, label: "限定ライブ" },
      { icon: BookOpen, label: "セミナー" },
    ],
    flow: ["イベント作成", "チケット販売", "ライブ配信", "収益化"],
  },
  {
    id: "archive",
    icon: Archive,
    color: "#f59e0b",
    emoji: "🎬",
    titleJa: "アーカイブ販売",
    titleEn: "Video Archives",
    descJa: "過去のライブ配信を再利用。一度の配信が永久資産に。24時間眠らない収益源。",
    descEn: "Repurpose past streams. One broadcast becomes a permanent asset — revenue that never sleeps.",
    keywordsJa: ["過去の動画も資産になる", "24時間眠らない収益源"],
    keywordsEn: ["Your past content = assets", "Revenue that never sleeps"],
    useCases: [
      { icon: Clock, label: "自動販売" },
      { icon: Archive, label: "過去配信の再利用" },
      { icon: Sparkles, label: "寝ながら稼ぐ" },
    ],
    flow: ["配信終了", "アーカイブ化", "価格設定", "24h販売"],
  },
  {
    id: "premium-vod",
    icon: Film,
    color: "#a855f7",
    emoji: "🎥",
    titleJa: "制作動画の有料配信",
    titleEn: "Premium VOD",
    descJa: "YouTubeのような編集済み動画を有料で公開。クオリティで勝負する高付加価値コンテンツ。",
    descEn: "Publish polished, edited videos behind a paywall. Compete on quality, not just quantity.",
    keywordsJa: ["クオリティで勝負", "高画質・高付加価値コンテンツ"],
    keywordsEn: ["Compete on quality", "High-value premium content"],
    useCases: [
      { icon: Film, label: "編集済み動画" },
      { icon: Sparkles, label: "高付加価値" },
      { icon: BookOpen, label: "教材・講座" },
    ],
    flow: ["動画制作", "アップロード", "価格設定", "全世界公開"],
  },
];

function FlowStep({ step, index, total, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black"
          style={{ background: color }}
        >
          {index + 1}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 text-center leading-tight w-14">{step}</p>
      </div>
      {index < total - 1 && (
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 -mt-4" />
      )}
    </div>
  );
}

function ModelCard({ model, index, onCtaClick }) {
  const Icon = model.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="rounded-2xl border-2 p-6 space-y-5 hover:scale-[1.01] transition-transform"
      style={{
        borderColor: model.color + "44",
        background: `linear-gradient(135deg, ${model.color}08, ${model.color}03)`,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: model.color + "22" }}
        >
          <Icon className="w-7 h-7" style={{ color: model.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-lg leading-tight" style={{ color: model.color }}>
            {model.titleJa}
          </p>
          <p className="text-xs text-muted-foreground font-semibold">{model.titleEn}</p>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <p className="text-sm text-foreground/90 leading-relaxed">{model.descJa}</p>
        <p className="text-xs text-muted-foreground italic">{model.descEn}</p>
      </div>

      {/* Use cases */}
      <div className="flex flex-wrap gap-2">
        {model.useCases.map((uc, i) => {
          const UcIcon = uc.icon;
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: model.color + "15", color: model.color, border: `1px solid ${model.color}33` }}
            >
              <UcIcon className="w-3 h-3" />
              {uc.label}
            </span>
          );
        })}
      </div>

      {/* Keywords */}
      <div className="space-y-1">
        {model.keywordsJa.map((kw, i) => (
          <p key={i} className="text-xs font-bold" style={{ color: model.color }}>
            「{kw}」
          </p>
        ))}
      </div>

      {/* Flow */}
      <div className="bg-background/60 rounded-xl p-3">
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2">収益化フロー</p>
        <div className="flex items-start justify-center gap-0">
          {model.flow.map((step, i) => (
            <FlowStep key={i} step={step} index={i} total={model.flow.length} color={model.color} />
          ))}
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={onCtaClick}
        variant="outline"
        className="w-full rounded-xl gap-2 font-bold text-sm h-10"
        style={{ borderColor: model.color + "55", color: model.color }}
      >
        このスタイルで始める <ArrowRight className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}

export default function BusinessModelShowcase({ onCtaClick }) {
  return (
    <section className="w-full py-16 px-4 sm:px-6 bg-gradient-to-b from-secondary/20 to-background">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <span className="bg-purple-500/20 text-purple-400 border border-purple-500/40 rounded-full px-4 py-1 text-xs font-bold">
            💡 ビジネスモデル図解 / Use Case Gallery
          </span>
          <h2 className="text-3xl sm:text-4xl font-black">
            ChatMarketで<span className="text-primary">何ができる？</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-2xl mx-auto">
            ライブ配信＝雑談だけじゃない。家庭教師、講演会、動画販売など、あなたのスキルを収益化する4つのモデル。
          </p>
          <p className="text-xs text-muted-foreground italic">
            Not just casual streaming — monetize your skills in 4 distinct ways.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MODELS.map((model, i) => (
            <ModelCard key={model.id} model={model} index={i} onCtaClick={onCtaClick} />
          ))}
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 text-center"
        >
          <p className="text-sm text-muted-foreground">
            すべてのモデルを<strong className="text-foreground">同時に</strong>使えます。組み合わせ自由。
          </p>
          <p className="text-xs text-muted-foreground italic mt-1">
            All models can be used simultaneously. Mix and match freely.
          </p>
        </motion.div>
      </div>
    </section>
  );
}