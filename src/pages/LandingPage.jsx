import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Zap, Radio, Video, PhoneCall, Coins, ArrowRight, Check,
  Play, Phone, Heart, Star, TrendingUp, Shield, Users
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import PlanSection from "../components/home/PlanSection";

const LOGO_URL = "https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png";

const features = [
  {
    icon: PhoneCall,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    title: "1対1ビデオ通話",
    desc: "有料の個別ビデオ通話を簡単に設定。ファンと直接つながり収益化できます。",
  },
  {
    icon: Radio,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    title: "有料ライブ配信",
    desc: "PPVチケット制のライブ配信。見たい人だけに届ける高品質なコンテンツを。",
  },
  {
    icon: Video,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
    title: "動画販売 (VOD)",
    desc: "制作した動画を1本単位で販売。あなたの知識・スキルをマネタイズ。",
  },
  {
    icon: Coins,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    title: "エールコイン投げ銭",
    desc: "ライブ・通話中にリアルタイムで応援できる投げ銭機能。ファンとの絆が深まります。",
  },
  {
    icon: Heart,
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/20",
    title: "クラウドファンディング",
    desc: "NPO・政党・個人がプロジェクトへの支援を募れます。審査制で安心・安全。",
  },
  {
    icon: TrendingUp,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    title: "プログレッシブ収益",
    desc: "月売上が高いほど還元率アップ。頑張るほど報われる仕組みです。",
  },
];

const steps = [
  { num: "01", title: "無料登録", desc: "メールアドレスだけで今すぐ登録。チャンネルを作成してすぐに発信を始められます。" },
  { num: "02", title: "プランを選ぶ", desc: "FREEプランは¥0で利用開始。必要な機能に合わせてBASIC・VOD・PPVプランへ。" },
  { num: "03", title: "コンテンツを配信", desc: "動画アップ・ライブ配信・通話受付など、あなたに合ったスタイルで発信してください。" },
  { num: "04", title: "収益を受け取る", desc: "売上は毎月自動集計。銀行振込でスムーズに受け取れます。" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 mb-6 text-sm font-semibold text-primary">
            <Zap className="w-4 h-4" /> クリエイター向け収益化プラットフォーム
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            あなたの<span className="text-primary">コンテンツ</span>で<br />
            稼ぐ、新しい方法。
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mb-8 leading-relaxed max-w-2xl mx-auto">
            ライブ配信・動画販売・1対1ビデオ通話・エールコイン投げ銭を<br className="hidden md:block" />
            このプラットフォーム1つで完結。FREEプランで今すぐ始められます。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 gap-2 text-base font-bold px-8"
              onClick={() => base44.auth.redirectToLogin()}
            >
              無料で始める <ArrowRight className="w-5 h-5" />
            </Button>
            <a href="#plans">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8 w-full sm:w-auto">
                料金プランを見る
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4">クレジットカード不要・登録無料</p>
        </div>
        {/* decorative blobs */}
        <div className="absolute top-10 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-secondary/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">すべての機能がひとつに</h2>
            <p className="text-muted-foreground">クリエイターに必要な収益化ツールをすべて搭載</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className={`rounded-2xl border p-5 ${f.bg}`}>
                  <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center mb-3">
                    <Icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className="font-bold text-base mb-1.5">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">はじめ方はカンタン</h2>
            <p className="text-muted-foreground">4ステップですぐに収益化スタート</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {steps.map((s) => (
              <div key={s.num} className="bg-card border border-border/50 rounded-2xl p-6 flex gap-4">
                <span className="text-3xl font-black text-primary/30 shrink-0">{s.num}</span>
                <div>
                  <h3 className="font-bold text-base mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-10 px-4 bg-secondary/20">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {[
              { icon: Shield, color: "text-blue-400", label: "安心・安全", desc: "審査制コンテンツで健全なプラットフォームを維持" },
              { icon: Star, color: "text-yellow-400", label: "最大90%還元", desc: "プログレッシブ収益で売上が高いほどお得に" },
              { icon: Users, color: "text-primary", label: "完全無料スタート", desc: "FREEプランで機能を試してからアップグレード" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="bg-card border border-border/50 rounded-2xl p-6">
                  <Icon className={`w-8 h-8 mx-auto mb-3 ${item.color}`} />
                  <p className="font-bold text-base mb-1">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <PlanSection />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 to-secondary">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-black mb-4">今すぐ無料で始めよう</h2>
          <p className="text-muted-foreground mb-8">登録は無料。クレジットカード不要。いつでも解約できます。</p>
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 gap-2 text-base font-bold px-10"
            onClick={() => base44.auth.redirectToLogin()}
          >
            無料アカウントを作成 <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
  );
}