import React from "react";
import { Download, Smartphone, Radio, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StreamingManual() {
  const guides = [
    {
      id: "obs",
      name: "OBS Studio",
      type: "PC専用",
      icon: "🖥️",
      color: "from-blue-600 to-blue-700",
      description: "高機能な配信ソフト。ゲーム実況、シーン切り替え、BGM組み込みなど、プロフェッショナル向け。",
      features: [
        "複数のシーンを使い分け可能",
        "BGMやSEの同時配信",
        "解像度・画質を細かく設定",
        "画面切り替えエフェクト",
        "ゲーム画面直接キャプチャ"
      ],
      steps: [
        {
          step: 1,
          title: "OBS Studio をダウンロード・インストール",
          content: "公式サイト obsproject.com から OBS をダウンロード（Windows / Mac / Linux 対応）"
        },
        {
          step: 2,
          title: "配信キーを取得",
          content: "ChatMarket の配信画面で『配信スタート』を押す → 『サーバーURL』と『ストリームキー』をコピー"
        },
        {
          step: 3,
          title: "OBS で設定",
          content: "設定 → 配信 → サーバーに『rtmps://[サーバーURL]:443/app/』を入力 → ストリームキーを貼り付け"
        },
        {
          step: 4,
          title: "配信内容をセットアップ",
          content: "左下『ソース』に『画面キャプチャ』『ウィンドウキャプチャ』『ゲーム』など追加 → マイク設定"
        },
        {
          step: 5,
          title: "配信開始",
          content: "『配信開始』ボタンを押す → ChatMarket で『ON AIR』表示を確認"
        }
      ],
      download: {
        link: "https://obsproject.com/download",
        text: "OBS Studio 公式ダウンロード →"
      }
    },
    {
      id: "prism",
      name: "Prism Live Studio",
      type: "スマホ対応",
      icon: "✨",
      color: "from-purple-600 to-purple-700",
      description: "スマホ向けプロフェッショナル配信アプリ。美しい画面エフェクト、テキスト・ステッカー追加可能。",
      features: [
        "豊富なビューティフィルター",
        "テキスト・ステッカー追加",
        "複数レイアウト機能",
        "バーチャル背景対応",
        "画面録画機能"
      ],
      steps: [
        {
          step: 1,
          title: "Prism Live Studio をインストール",
          content: "App Store（iOS）または Google Play Store（Android）から『Prism Live Studio』をダウンロード"
        },
        {
          step: 2,
          title: "アプリを開く",
          content: "Prism を開く → 『Live』を選択"
        },
        {
          step: 3,
          title: "配信方式を選択",
          content: "『Custom RTMPS』を選択"
        },
        {
          step: 4,
          title: "URL をペースト",
          content: "ChatMarket で『クリックしてコピー』を押したスマホ用 URL を貼り付け"
        },
        {
          step: 5,
          title: "配信開始",
          content: "『Start Live』をタップ → 必要なエフェクトを追加 → 配信開始"
        }
      ],
      download: {
        link: "https://prismlive.com/",
        text: "Prism Live Studio 公式サイト →"
      }
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button onClick={() => window.history.back()} className="text-muted-foreground hover:text-foreground text-sm mb-3">
            ← 戻る
          </button>
          <h1 className="text-3xl font-black text-white">配信マニュアル</h1>
          <p className="text-muted-foreground text-sm mt-2">OBS・Larix・Prism Live Studio の配信方法をわかりやすく解説</p>
          <div className="mt-4 bg-orange-500/15 border border-orange-500/30 rounded-lg px-3 py-2">
            <p className="text-sm font-semibold text-orange-300">💡 有料生配信を行うには、配信専用アプリを経由して配信を行います</p>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {guides.filter(guide => guide.id !== 'larix').map((guide) => (
            <div key={guide.id} className="space-y-6">
              {/* カード */}
              <div className={`bg-gradient-to-br ${guide.color} rounded-2xl p-6 text-white shadow-lg`}>
                <div className="text-5xl mb-3">{guide.icon}</div>
                <h2 className="text-2xl font-black">{guide.name}</h2>
                <p className="text-sm font-semibold opacity-90 mt-1">{guide.type}</p>
                <p className="text-sm opacity-85 mt-3 leading-relaxed">{guide.description}</p>

                {/* 特徴 */}
                <div className="mt-6 space-y-2">
                  <p className="text-xs font-bold opacity-75 uppercase tracking-widest">特徴</p>
                  {guide.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" />
                      <span className="text-sm opacity-90">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ダウンロード */}
              <div className="space-y-2">
                {guide.download.link && (
                  <a href={guide.download.link} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black gap-2">
                      <Download className="w-4 h-4" />
                      {guide.download.text}
                    </Button>
                  </a>
                )}
                {guide.download.ios && (
                  <>
                    <a href={guide.download.ios.link} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-black hover:bg-gray-900 text-white font-bold gap-2">
                        <Download className="w-4 h-4" />
                        🍎 App Store
                      </Button>
                    </a>
                    <a href={guide.download.android.link} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2">
                        <Download className="w-4 h-4" />
                        🤖 Google Play
                      </Button>
                    </a>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 重要な案内 */}
        <div className="mt-16 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 space-y-2 mb-12">
          <p className="text-lg font-black text-blue-400">ℹ️ 有料生配信について</p>
          <p className="text-sm text-blue-200/80 leading-relaxed">有料生配信（チケット販売・PPV配信）を行うには、下記の配信専用アプリを経由して配信を行う必要があります。これにより、安全で安定した配信環境が実現されます。</p>
        </div>

        {/* 詳細ガイド */}
        <div className="space-y-12">
          {guides.filter(guide => guide.id !== 'larix').map((guide) => (
            <div key={guide.id} className="border-l-4 border-primary/50 pl-6 space-y-6">
              <h3 className="text-2xl font-black text-white">{guide.name} で配信する</h3>

              {/* ステップ */}
              <div className="grid gap-4">
                {guide.steps.map((step) => (
                  <div key={step.step} className="bg-card border border-border/50 rounded-xl p-5 space-y-2 hover:border-primary/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-black shrink-0">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white">{step.title}</h4>
                        <p className="text-muted-foreground text-sm mt-1">{step.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 注意事項 */}
        <div className="mt-16 bg-orange-500/10 border border-orange-500/30 rounded-xl p-6 space-y-3">
          <p className="text-lg font-black text-orange-400">⚠️ 重要な注意事項</p>
          <ul className="space-y-2 text-muted-foreground text-sm">
            <li>• ストリームキーは絶対に他人に教えないでください。配信を乗っ取られます</li>
            <li>• 安定したインターネット接続が必要です（WiFi 推奨）</li>
            <li>• 配信中は他のアプリを同時に実行すると映像がカクカクになる可能性があります</li>
            <li>• 問題が発生した場合は、アプリを再起動してから再度試してください</li>
          </ul>
        </div>
      </div>
    </div>
  );
}