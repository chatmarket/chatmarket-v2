import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Radio, Video, PhoneCall, Users, TrendingUp, Download, Smartphone } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="w-full bg-background text-foreground">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "linear-gradient(#ff3366 1px,transparent 1px),linear-gradient(90deg,#ff3366 1px,transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <style>{`
            @keyframes neonFlicker {
              0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 20px #ff3366, 0 0 40px #ff3366; color: #fff; }
              20%, 24%, 55% { text-shadow: none; color: #ff3366; }
            }
            .neon-text { animation: neonFlicker 3s infinite alternate; font-family: Georgia, serif; letter-spacing: 0.15em; }
          `}</style>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black">
            <span className="neon-text">Chat Market</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground">
            有料ライブ配信・動画販売・1対1有料ビデオ通話を<br />このプラットフォーム一つで。
          </p>
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/90 h-12 px-8 text-lg gap-2">
              新規登録して始める
            </Button>
          </Link>
        </div>
      </section>

      {/* 機能紹介 */}
      <section className="py-16 sm:py-24 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">主要機能</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {[
            { icon: Radio, title: "ライブ配信", desc: "有料ライブ配信でチケット販売" },
            { icon: Video, title: "動画販売", desc: "オンデマンド動画の販売・配信" },
            { icon: PhoneCall, title: "1対1通話", desc: "有料ビデオ通話で個別対応" },
            { icon: Users, title: "ファンクラブ", desc: "月額メンバーシップ運営" },
            { icon: TrendingUp, title: "分析ツール", desc: "収益データをリアルタイム確認" },
            { icon: Download, title: "PWA対応", desc: "ホーム画面に追加して利用可能" },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div key={i} className="bg-card rounded-xl border border-border/50 p-6 text-center space-y-3">
                <Icon className="w-10 h-10 text-primary mx-auto" />
                <h3 className="font-bold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 価格 */}
      <section className="py-16 sm:py-24 px-4 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">プラン</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { name: "FREE", price: "無料", features: ["基本配信機能", "動画販売", "通話受付（70%還元）"] },
              { name: "BASIC", price: "¥3,300/月", features: ["全機能利用", "通話還元85%", "優先サポート"] },
              { name: "VOD", price: "準備中", features: ["動画最適化", "高度な分析", "（近日提供予定）"] },
              { name: "Enterprise", price: "準備中", features: ["複数チャンネル", "カスタム機能", "（お問い合わせ）"] },
            ].map((plan, i) => (
              <div key={i} className={`rounded-xl border p-6 space-y-4 ${plan.price === "準備中" ? "bg-card border-border/30 opacity-60" : "bg-card border-primary/40"}`}>
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <p className="text-2xl font-black text-primary">{plan.price}</p>
                <ul className="text-xs space-y-2">
                  {plan.features.map((f, j) => <li key={j} className="text-muted-foreground">• {f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 収益還元率 */}
      <section className="py-16 sm:py-24 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">クリエイター収益還元率</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "動画販売", rate: "85%", detail: "クリエイターへの配分（手数料15%）" },
            { title: "ライブ配信", rate: "85%", detail: "チケット売上（手数料15%）" },
            { title: "ビデオ通話", rate: "70%", detail: "通話料金（手数料30%）" },
          ].map((item, i) => (
            <div key={i} className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/40 rounded-xl p-8 text-center space-y-3">
              <h3 className="font-bold text-xl">{item.title}</h3>
              <p className="text-4xl font-black text-primary">{item.rate}</p>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* プログレッシブインセンティブ */}
      <section className="py-16 sm:py-24 px-4 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8">プログレッシブインセンティブ</h2>
          <div className="bg-card border border-border/50 rounded-xl p-6 sm:p-8 space-y-4">
            <p className="text-muted-foreground">月間売上に応じて手数料が段階的に減少。売上が増えるほど、配分率もアップ。</p>
            <div className="space-y-3">
              {[
                { threshold: "月間売上 ¥0〜", rate: "標準還元率" },
                { threshold: "月間売上 ¥100万〜", rate: "手数料-1%" },
                { threshold: "月間売上 ¥500万〜", rate: "手数料-3%" },
                { threshold: "月間売上 ¥1,000万〜", rate: "特別プラン（相談）" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-border/50 pb-3">
                  <span className="text-muted-foreground">{item.threshold}</span>
                  <span className="font-semibold text-primary">{item.rate}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PWA案内 */}
      <section className="py-16 sm:py-24 px-4 max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">PWA（プログレッシブウェブアプリ）で快適に</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {[
            {
              browser: "📱 iPhone / iPad（Safari）",
              steps: [
                "下部メニューの上矢印をタップ",
                "「ホーム画面に追加」を選択",
                "ホーム画面にアプリアイコン表示"
              ]
            },
            {
              browser: "🤖 Android（Chrome）",
              steps: [
                "右上のメニュー（⋮）をタップ",
                "「インストール」を選択",
                "スマホアプリのように利用可能"
              ]
            },
            {
              browser: "💻 Windows / macOS（Chrome）",
              steps: [
                "アドレスバー右のインストールアイコン",
                "「インストール」をクリック",
                "デスクトップから起動"
              ]
            },
            {
              browser: "🎯 その他のブラウザ",
              steps: [
                "各ブラウザのメニューから",
                "「ホーム画面に追加」を選択",
                "ワンタップで素早く起動"
              ]
            }
          ].map((item, i) => (
            <div key={i} className="bg-card rounded-xl border border-border/50 p-6 space-y-4">
              <h3 className="font-bold text-lg">{item.browser}</h3>
              <ol className="space-y-2">
                {item.steps.map((step, j) => (
                  <li key={j} className="text-sm text-muted-foreground flex gap-3">
                    <span className="font-bold text-primary shrink-0">{j + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        <div className="mt-8 bg-primary/10 border border-primary/30 rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground">💡 アプリのように快適・オフライン対応・プッシュ通知で新しい配信をお知らせ</p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-4 bg-gradient-to-br from-primary/20 to-primary/5 border-t border-primary/20">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">今すぐ始めよう</h2>
          <p className="text-lg text-muted-foreground">配信、販売、通話で収益を上げる。Chat Marketであなたの活動をマネタイズ。</p>
          <Link to="/">
            <Button className="bg-primary hover:bg-primary/90 h-12 px-8 text-lg gap-2">
              新規登録する
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50 text-center text-xs text-muted-foreground">
        <p>© 2024 Chat Market. All rights reserved.</p>
      </footer>
    </div>
  );
}