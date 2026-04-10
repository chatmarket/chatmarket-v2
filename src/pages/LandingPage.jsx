import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Radio, Video, PhoneCall, Users, TrendingUp, Download, Smartphone } from "lucide-react";

const SignUpButton = ({ variant = "default" }) => {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate("/");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100);
  };
  return (
    <Button onClick={handleClick} className="bg-primary hover:bg-primary/90">
      新規登録して始める
    </Button>
  );
};

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
          
          {/* 言論の自由メッセージ */}
          <div className="mt-8 sm:mt-10 max-w-2xl mx-auto space-y-3 border-t border-muted/30 pt-6 sm:pt-8">
            <div className="space-y-2">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                言論の自由を体感してください、法的な問題発言以外は当サイトにおいて規制はかけません
              </p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                ＊配信者が設定するNGワードがありますので、配信者は安心して配信に集中できます
              </p>
            </div>
            
            <div className="space-y-2 pt-3 border-t border-muted/20">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Experience free speech. No restrictions apply here, except for illegal remarks.
              </p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                *Streamers can filter out specific words, so they can stream safely and focus on their content.
              </p>
            </div>
          </div>
          
          <div className="mt-8 sm:mt-10">
            <SignUpButton />
          </div>
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

      {/* 詳細プラン紹介 */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-black">柔軟なプランで、あなたに最適な選択</h2>
            <p className="text-lg text-muted-foreground">始める時は無料から。成長に合わせてアップグレード。</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* FREE Plan */}
            <div className="relative rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 p-8 space-y-6 hover:border-cyan-500/60 transition-all group">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-full">人気</span>
                </div>
                <h3 className="text-2xl font-black text-cyan-400">FREE</h3>
                <p className="text-4xl font-black">¥0</p>
                <p className="text-sm text-muted-foreground">月額料金なし</p>
              </div>
              <div className="space-y-3 border-t border-cyan-500/20 pt-6">
                <p className="font-semibold text-sm">✨ 利用可能な機能：</p>
                <ul className="space-y-3">
                  {[
                    "📹 ライブ配信（PPV対応）",
                    "🎬 動画販売",
                    "📞 1対1ビデオ通話（70%還元）",
                    "📊 基本分析ツール",
                    "👥 ファンクラブ機能",
                    "💬 チャット・メッセージング"
                  ].map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="mt-0.5">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg p-4 text-sm">
                <p className="text-cyan-300 font-semibold">💡 まずはここから始めよう</p>
              </div>
            </div>

            {/* BASIC Plan */}
            <div className="relative rounded-2xl border-2 border-primary/60 bg-gradient-to-br from-primary/20 to-primary/5 p-8 space-y-6 hover:border-primary/80 transition-all shadow-lg shadow-primary/20 ring-1 ring-primary/30">
              <div className="absolute -top-4 left-6 bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-1 rounded-full text-xs font-black">⭐ おすすめ</div>
              <div className="space-y-2 pt-2">
                <h3 className="text-2xl font-black text-primary">BASIC</h3>
                <p className="text-4xl font-black">¥3,300</p>
                <p className="text-sm text-muted-foreground">月額料金（税込み）</p>
              </div>
              <div className="space-y-3 border-t border-primary/20 pt-6">
                <p className="font-semibold text-sm">✨ FREEプラン全機能 + ：</p>
                <ul className="space-y-3">
                  {[
                    "📞 ビデオ通話還元率 85%（15%手数料）",
                    "📈 高度な収益分析ツール",
                    "⭐ プロフィール優先表示",
                    "🏆 カテゴリーランキング上位",
                    "🎯 優先カスタマーサポート",
                    "🔄 無制限配信・動画投稿"
                  ].map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-primary font-bold">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-primary/20 border border-primary/40 rounded-lg p-4 text-sm">
                <p className="text-primary font-semibold">🚀 売上が増えるほどお得！</p>
                <p className="text-xs text-muted-foreground mt-1">月額¥3,300で通話還元が15%アップ</p>
              </div>
            </div>

            {/* VOD Plan */}
            <div className="relative rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-8 space-y-6 opacity-75">
              <div className="space-y-2">
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded-full">準備中</span>
                <h3 className="text-2xl font-black text-amber-400">VOD</h3>
                <p className="text-4xl font-black">¥4,980</p>
                <p className="text-sm text-muted-foreground">月額料金（近日提供予定）</p>
              </div>
              <div className="space-y-3 border-t border-amber-500/20 pt-6">
                <p className="font-semibold text-sm">✨ BASIC機能 + ：</p>
                <ul className="space-y-3">
                  {[
                    "🎥 4K動画最適化",
                    "🎞️ 動画エンコーディング",
                    "📊 詳細な視聴者分析",
                    "🤖 AI字幕生成",
                    "📦 バッチアップロード",
                    "🌐 多言語対応サポート"
                  ].map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-300/60">
                詳細は後日アナウンスいたします
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="relative rounded-2xl border-2 border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-8 space-y-6 opacity-75">
              <div className="space-y-2">
                <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-bold rounded-full">カスタム相談</span>
                <h3 className="text-2xl font-black text-purple-400">Enterprise</h3>
                <p className="text-3xl font-black">カスタム</p>
                <p className="text-sm text-muted-foreground">大規模利用向けプラン</p>
              </div>
              <div className="space-y-3 border-t border-purple-500/20 pt-6">
                <p className="font-semibold text-sm">✨ 企業・大規模利用向け：</p>
                <ul className="space-y-3">
                  {[
                    "🏢 複数チャンネル管理",
                    "⚙️ カスタマイズ機能",
                    "🔐 エンタープライズセキュリティ",
                    "👥 専任サポート",
                    "💼 プライベート契約",
                    "📱 デジタルコンテンツ販売"
                  ].map((f, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-sm">
                <p className="text-purple-300 font-semibold mb-2">お気軽にお問い合わせください</p>
                <p className="text-xs text-muted-foreground">営業チームが最適なプランをご提案します</p>
              </div>
            </div>
          </div>

          {/* 比較表 */}
          <div className="mt-16 bg-card border border-border/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary border-b border-border/50">
                    <th className="text-left p-4 font-bold">機能</th>
                    <th className="text-center p-4 font-bold">FREE</th>
                    <th className="text-center p-4 font-bold text-primary">BASIC</th>
                    <th className="text-center p-4 font-bold text-amber-400">VOD</th>
                    <th className="text-center p-4 font-bold text-purple-400">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: "ライブ配信", free: "✓", basic: "✓", vod: "✓", ent: "✓" },
                    { feature: "動画販売", free: "✓", basic: "✓", vod: "✓", ent: "✓" },
                    { feature: "ビデオ通話", free: "✓ 70%", basic: "✓ 85%", vod: "✓ 85%", ent: "カスタム" },
                    { feature: "ファンクラブ", free: "✓", basic: "✓", vod: "✓", ent: "✓" },
                    { feature: "基本分析", free: "✓", basic: "✓", vod: "✓", ent: "✓" },
                    { feature: "詳細分析", free: "-", basic: "✓", vod: "✓", ent: "✓" },
                    { feature: "プロフィール優先表示", free: "-", basic: "✓", vod: "✓", ent: "✓" },
                    { feature: "優先サポート", free: "-", basic: "✓", vod: "✓", ent: "✓" },
                    { feature: "4K対応", free: "-", basic: "-", vod: "✓", ent: "✓" },
                    { feature: "複数チャンネル", free: "-", basic: "-", vod: "-", ent: "✓" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-secondary/50">
                      <td className="p-4 font-semibold text-muted-foreground">{row.feature}</td>
                      <td className="text-center p-4 text-cyan-400 font-semibold">{row.free}</td>
                      <td className="text-center p-4 text-primary font-semibold">{row.basic}</td>
                      <td className="text-center p-4 text-amber-400 font-semibold">{row.vod}</td>
                      <td className="text-center p-4 text-purple-400 font-semibold">{row.ent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 価格 */}
      <section className="py-16 sm:py-24 px-4 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
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
        </div>
      </section>

      {/* プログレッシブインセンティブ */}
      <section className="py-16 sm:py-24 px-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-y border-green-500/20">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-4xl sm:text-5xl font-black text-green-400">📈 プログレッシブ・インセンティブ</h2>
            <p className="text-xl text-muted-foreground">売上が増えるほど収益還元率がUP。最大95%まで段階的に上昇。</p>
          </div>

          {/* 説明カード */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-green-500/20 border border-green-500/40 rounded-xl p-6 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                  <h3 className="font-bold text-green-300 text-lg">BASICプランで自動参加</h3>
                  <p className="text-sm text-muted-foreground mt-1">手続き不要。加入した月から自動的に適用されます。プログレッシブの恩恵をすぐに受けられます。</p>
                </div>
              </div>
            </div>
            <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-6 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <h3 className="font-bold text-blue-300 text-lg">翌月に反映</h3>
                  <p className="text-sm text-muted-foreground mt-1">当月の売上実績に基づいて、翌月の還元率が自動的に決定・適用されます。成長に応じた報償を実感。</p>
                </div>
              </div>
            </div>
          </div>

          {/* 階層別収益率表 */}
          <div className="bg-card border border-green-500/30 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-500/20 to-green-600/10 p-6 border-b border-green-500/20">
              <h3 className="font-bold text-lg text-green-300">📊 月間売上の階層別 収益還元率</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary border-b border-border/50">
                    <th className="text-left p-4 font-bold text-sm">月間売上</th>
                    <th className="text-center p-4 font-bold text-sm">収益還元率</th>
                    <th className="text-right p-4 font-bold text-sm">手数料</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { min: "¥0", max: "¥100万未満", rate: "85%", fee: "15%" },
                    { min: "¥100万", max: "¥300万未満", rate: "86%", fee: "14%" },
                    { min: "¥300万", max: "¥600万未満", rate: "87%", fee: "13%" },
                    { min: "¥600万", max: "¥900万未満", rate: "88%", fee: "12%" },
                    { min: "¥900万", max: "¥1,200万未満", rate: "89%", fee: "11%" },
                    { min: "¥1,200万", max: "¥1,500万未満", rate: "90%", fee: "10%" },
                    { min: "¥1,500万", max: "¥1,650万未満", rate: "91%", fee: "9%" },
                    { min: "¥1,650万", max: "¥1,800万未満", rate: "92%", fee: "8%" },
                    { min: "¥1,800万", max: "¥1,950万未満", rate: "93%", fee: "7%" },
                    { min: "¥1,950万", max: "¥2,000万未満", rate: "94%", fee: "6%" },
                    { min: "¥2,000万以上", max: "", rate: "95%", fee: "5%" },
                  ].map((row, i) => {
                    const isHighlight = i >= 8;
                    return (
                      <tr key={i} className={`border-b border-border/30 ${
                        isHighlight
                          ? "bg-green-500/10 hover:bg-green-500/20"
                          : "hover:bg-secondary/50"
                      }`}>
                        <td className="p-4 text-sm font-semibold">
                          <span className="text-muted-foreground">{row.min}</span>
                          {row.max && (
                            <>
                              <span className="text-muted-foreground/60 mx-2">〜</span>
                              <span className="text-muted-foreground">{row.max}</span>
                            </>
                          )}
                        </td>
                        <td className={`text-center p-4 font-black text-lg ${
                          isHighlight ? "text-green-400" : "text-primary"
                        }`}>
                          {row.rate}
                        </td>
                        <td className="text-right p-4 text-sm text-muted-foreground">{row.fee}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-green-500/10 border-t border-green-500/20 p-4 text-center">
              <p className="text-xs text-green-300">✨ 翌月に反映されます。月ごとに最適な還元率が自動適用されます。</p>
            </div>
          </div>

          {/* 例示セクション */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border/50 rounded-xl p-6 space-y-4">
              <h4 className="font-bold text-lg">📌 例：月間売上¥1,000万の場合</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">月間売上</span>
                  <span className="font-bold">¥10,000,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">還元率</span>
                  <span className="font-bold text-green-400">89%</span>
                </div>
                <div className="border-t border-border/50 pt-3 flex justify-between text-base">
                  <span className="font-semibold">クリエイター取分</span>
                  <span className="font-black text-green-400">¥8,900,000</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>手数料（11%）</span>
                  <span>¥1,100,000</span>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-6 space-y-4">
              <h4 className="font-bold text-lg">📌 例：月間売上¥2,500万の場合</h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">月間売上</span>
                  <span className="font-bold">¥25,000,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">還元率</span>
                  <span className="font-bold text-green-400">95%</span>
                </div>
                <div className="border-t border-border/50 pt-3 flex justify-between text-base">
                  <span className="font-semibold">クリエイター取分</span>
                  <span className="font-black text-green-400">¥23,750,000</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>手数料（5%）</span>
                  <span>¥1,250,000</span>
                </div>
              </div>
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
          <SignUpButton />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50 text-center text-xs text-muted-foreground">
        <p>© 2024 Chat Market. All rights reserved.</p>
      </footer>
    </div>
  );
}