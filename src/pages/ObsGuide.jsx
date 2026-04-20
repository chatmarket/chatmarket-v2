import React, { useState } from "react";
import { ExternalLink, Download, AlertTriangle, Monitor, Settings, Video, Radio, CheckCircle } from "lucide-react";

const STEPS = [
  {
    num: 1,
    icon: Settings,
    title: "OBSを開き、設定を開く",
    desc: "インストールしたOBS Studioを起動し、右下の「設定」ボタンをクリックします。",
    imgAlt: "OBS設定画面のスクリーンショット",
    tip: "OBSが起動したら、まず「設定」ボタンを探してください。画面の右下にあります。",
  },
  {
    num: 2,
    icon: Radio,
    title: "配信サーバーとキーの設定",
    desc: "左メニューの「配信」を選び、サービスを「カスタム」にします。ChatMarketの配信準備画面で発行された「RTMP URL」をサーバーに、「ストリームキー」を対応する欄に貼り付けます。",
    imgAlt: "OBS配信設定のスクリーンショット",
    tip: "サービスが「Twitch」などになっている場合は「カスタム」に変更してください。",
    highlight: true,
  },
  {
    num: 3,
    icon: Video,
    title: "映像と音声ソースの追加",
    desc: "メイン画面に戻り、「ソース」の「＋」ボタンから「映像キャプチャデバイス（カメラ）」や「音声入力キャプチャ（マイク）」を追加します。",
    imgAlt: "OBSソース追加のスクリーンショット",
    tip: "カメラとマイクが認識されない場合はOSのプライバシー設定でアクセスを許可してください。",
    subtips: [
      "📷 カメラ：デバイスが複数ある場合は「デバイス」のドロップダウンで正しいカメラを選択",
      "🎤 マイク：「デバイス」から使用するマイク（USB接続推奨）を選択、音量バーが反応するか確認",
    ],
  },
  {
    num: 4,
    icon: CheckCircle,
    title: "配信開始！",
    desc: "準備ができたら、OBS右下の「配信開始」をクリックし、ChatMarketの画面で映像が映っているか確認してください。",
    imgAlt: "OBS配信開始のスクリーンショット",
    tip: "映像が映らない場合はRTMP URLとストリームキーを再確認してください。",
  },
];

export default function ObsGuide() {
  const [activeStep, setActiveStep] = useState(null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Monitor className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-purple-400 tracking-widest uppercase mb-0.5">OBS配信マニュアル</p>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
              OBS Studioを使った本格配信の始め方
            </h1>
          </div>
        </div>

        <p className="text-zinc-400 text-sm leading-relaxed">
          高画質・高音質なプロ仕様のライブ配信を行うための手順をご案内します。<br />
          初めての方でも迷わないよう、ステップごとに丁寧に説明しています。
        </p>

        {/* Download button */}
        <a
          href="https://obsproject.com/ja"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black px-5 py-3 rounded-xl transition-colors shadow-lg shadow-purple-500/20"
        >
          <Download className="w-5 h-5" />
          OBSのダウンロードはこちら（無料）
          <ExternalLink className="w-4 h-4 opacity-70" />
        </a>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 bg-orange-500/10 border border-orange-500/40 rounded-2xl px-5 py-4">
        <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-orange-300 font-black text-sm mb-0.5">ストリームキーの取り扱いに注意</p>
          <p className="text-orange-200/70 text-xs leading-relaxed">
            ストリームキーは絶対に他人に教えないでください。アカウントが乗っ取られ、勝手に配信される恐れがあります。
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        {STEPS.map((step) => {
          const Icon = step.icon;
          const isOpen = activeStep === step.num;
          return (
            <div
              key={step.num}
              className={`rounded-2xl border transition-all overflow-hidden ${
                step.highlight
                  ? "border-primary/40 bg-primary/5"
                  : "border-zinc-800 bg-zinc-900"
              }`}
            >
              {/* Step header */}
              <button
                onClick={() => setActiveStep(isOpen ? null : step.num)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
              >
                {/* Badge */}
                <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-black text-lg ${
                  step.highlight
                    ? "bg-primary text-primary-foreground"
                    : "bg-zinc-800 text-zinc-300"
                }`}>
                  {step.num}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon className={`w-4 h-4 ${step.highlight ? "text-primary" : "text-zinc-500"}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${step.highlight ? "text-primary" : "text-zinc-600"}`}>
                      STEP {step.num}
                    </span>
                  </div>
                  <p className="font-black text-white text-sm sm:text-base">{step.title}</p>
                </div>

                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} ${step.highlight ? "border-primary/40 text-primary" : "border-zinc-700 text-zinc-500"}`}>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-zinc-800">
                  <p className="text-zinc-300 text-sm leading-relaxed pt-4">{step.desc}</p>

                  {/* Screenshot placeholder */}
                  <div className="w-full aspect-video rounded-xl bg-zinc-800 border border-zinc-700 flex flex-col items-center justify-center gap-2 text-zinc-600">
                    <Monitor className="w-10 h-10" />
                    <p className="text-xs font-semibold">{step.imgAlt}</p>
                  </div>

                  {/* Tip */}
                  <div className="flex items-start gap-2 bg-zinc-800 rounded-xl px-4 py-3">
                    <span className="text-primary text-sm shrink-0">💡</span>
                    <div>
                      <p className="text-zinc-400 text-xs leading-relaxed">{step.tip}</p>
                      {step.subtips && (
                        <ul className="text-zinc-500 text-xs mt-2 space-y-1 ml-2 border-l border-zinc-600 pl-2">
                          {step.subtips.map((subtip, i) => (
                            <li key={i} className="leading-relaxed">{subtip}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RTMP info block */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-3">
        <h3 className="font-black text-white text-sm flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" /> RTMP URLとストリームキーの確認方法
        </h3>
        <p className="text-zinc-400 text-sm leading-relaxed">
          配信作成画面で「OBS配信を選ぶ」を選択すると、RTMP URLとストリームキーが発行されます。<br />
          それらをOBSの設定にコピー＆ペーストしてください。
        </p>
        <a
          href="/go-live"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-bold underline underline-offset-2 transition-colors"
        >
          配信作成画面に戻る →
        </a>
      </div>

      {/* オーディオ設定セクション */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
        <h3 className="font-black text-white text-sm flex items-center gap-2">
          🎤 マイク・オーディオ設定（推奨値）
        </h3>
        <div className="space-y-3 text-xs text-zinc-300">
          <div className="bg-zinc-800 rounded-lg p-3 space-y-1">
            <p className="font-bold text-zinc-100">サンプリングレート</p>
            <p>48kHz（推奨） - ほぼすべてのマイク対応</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 space-y-1">
            <p className="font-bold text-zinc-100">マイク入力レベル</p>
            <p>-10dB 〜 -3dB（ピークが赤くならないが、緑ランプが反応する高さ）</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 space-y-1">
            <p className="font-bold text-zinc-100">ノイズ抑制（オプション）</p>
            <p>フィルタを追加 → 「ノイズサプレッション」で環境ノイズ軽減</p>
          </div>
        </div>
      </div>

      {/* 品質設定セクション */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
        <h3 className="font-black text-white text-sm flex items-center gap-2">
          📊 映像・音声品質設定（ゲーム配信向け）
        </h3>
        <div className="space-y-3 text-xs text-zinc-300">
          <div className="bg-zinc-800 rounded-lg p-3 space-y-1">
            <p className="font-bold text-zinc-100">フレームレート</p>
            <p>60fps（ゲーム重視） または 30fps（安定重視）</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 space-y-1">
            <p className="font-bold text-zinc-100">ビットレート（ゲーム画面）</p>
            <p>4500kbps以上（通信速度20Mbps以上推奨）</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3 space-y-1">
            <p className="font-bold text-zinc-100">音声ビットレート</p>
            <p>128kbps（ステレオ） - ゲーム配信ではこれで十分</p>
          </div>
        </div>
      </div>

      {/* トラブルシューティング */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
        <h3 className="font-black text-white text-sm flex items-center gap-2">
          ⚠️ トラブルシューティング
        </h3>
        <div className="space-y-2 text-xs text-zinc-300">
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="font-bold text-zinc-100 mb-1">❌ 映像が映らない</p>
            <ul className="ml-3 space-y-0.5 text-zinc-400">
              <li>• RTMP URLとストリームキーを再確認</li>
              <li>• OSプライバシー設定でOBSのカメラアクセスを許可</li>
              <li>• 他アプリがカメラを占有していないか確認</li>
            </ul>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="font-bold text-zinc-100 mb-1">❌ マイクから音が出ない</p>
            <ul className="ml-3 space-y-0.5 text-zinc-400">
              <li>• OBS「オーディオミキサー」で音量バーが反応するか確認</li>
              <li>• 音声ソースのデバイスが正しいマイクか確認</li>
              <li>• Windowsシステム音量でマイクがミュートされていないか確認</li>
            </ul>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="font-bold text-zinc-100 mb-1">❌ 配信が遅延する・カクつく</p>
            <ul className="ml-3 space-y-0.5 text-zinc-400">
              <li>• インターネット速度を測定（20Mbps以上推奨）</li>
              <li>• OBS「設定」→「映像」でフレームレート下げる</li>
              <li>• バックグラウンドアプリを終了</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-zinc-600 pb-4">
        OBS Studioは無料のオープンソースソフトウェアです。Windows / macOS / Linux に対応しています。
      </p>
    </div>
  );
}