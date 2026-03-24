import React, { useState } from "react";
import { Smartphone, Share, MoreVertical, Plus, Home, ChevronDown, ChevronUp } from "lucide-react";

const browsers = [
  {
    id: "safari-ios",
    label: "Safari（iPhone）",
    icon: "🍎",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    steps: [
      {
        icon: <Share className="w-5 h-5 text-blue-400" />,
        title: "共有ボタンをタップ",
        desc: "画面下部の「↑」共有アイコンをタップ",
        visual: (
          <div className="flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 p-3 mt-2">
            <div className="w-full max-w-[200px]">
              <div className="bg-gray-800 rounded-lg p-2 flex items-center justify-between text-xs text-gray-400 mb-2">
                <span>chatmarket.app</span>
                <Share className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex justify-around bg-gray-900 border-t border-gray-700 pt-2">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-6 h-6 bg-gray-700 rounded-md" />
                  <span className="text-[9px] text-gray-500">戻る</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <Share className="w-5 h-5 text-blue-400" />
                  <span className="text-[9px] text-blue-400 font-semibold">共有</span>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-6 h-6 bg-gray-700 rounded-md" />
                  <span className="text-[9px] text-gray-500">ブックマーク</span>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        icon: <Plus className="w-5 h-5 text-green-400" />,
        title: "「ホーム画面に追加」を選択",
        desc: "メニューをスクロールして「ホーム画面に追加」をタップ",
        visual: (
          <div className="flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 p-3 mt-2">
            <div className="w-full max-w-[200px] space-y-1">
              {["メッセージで送信", "メールで送信", "コピー"].map((item) => (
                <div key={item} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-400">
                  <div className="w-5 h-5 bg-gray-700 rounded" />
                  <span>{item}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/40 rounded-lg text-xs text-green-400 font-semibold">
                <Plus className="w-4 h-4" />
                <span>ホーム画面に追加</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        icon: <Home className="w-5 h-5 text-primary" />,
        title: "「追加」をタップして完了",
        desc: "右上の「追加」ボタンを押すとホーム画面に追加されます",
        visual: (
          <div className="flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 p-3 mt-2">
            <div className="w-full max-w-[200px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-blue-400">キャンセル</span>
                <span className="text-xs font-semibold text-gray-300">ホーム画面に追加</span>
                <span className="text-xs text-blue-400 font-bold">追加</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                  <img src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png" alt="ChatMarket" className="w-10 h-10 object-contain" />
                </div>
                <span className="text-xs text-gray-300 font-medium">ChatMarket</span>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "chrome-android",
    label: "Chrome（Android）",
    icon: "🤖",
    color: "from-green-500/20 to-green-600/10 border-green-500/30",
    steps: [
      {
        icon: <MoreVertical className="w-5 h-5 text-gray-400" />,
        title: "メニューをタップ",
        desc: "右上の「︙（縦3点）」メニューをタップ",
        visual: (
          <div className="flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 p-3 mt-2">
            <div className="w-full max-w-[200px]">
              <div className="bg-gray-800 rounded-lg p-2 flex items-center justify-between text-xs text-gray-400">
                <span className="truncate">chatmarket.app</span>
                <MoreVertical className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-yellow-400 font-semibold bg-yellow-400/10 px-2 py-0.5 rounded">← ここをタップ</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        icon: <Plus className="w-5 h-5 text-green-400" />,
        title: "「ホーム画面に追加」を選択",
        desc: "ドロップダウンから「ホーム画面に追加」をタップ",
        visual: (
          <div className="flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 p-3 mt-2">
            <div className="w-full max-w-[200px] space-y-1">
              {["新しいタブ", "新しいシークレットタブ", "ブックマーク"].map((item) => (
                <div key={item} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-400">
                  <div className="w-4 h-4 bg-gray-700 rounded" />
                  <span>{item}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/40 rounded-lg text-xs text-green-400 font-semibold">
                <Plus className="w-4 h-4" />
                <span>ホーム画面に追加</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        icon: <Home className="w-5 h-5 text-primary" />,
        title: "「追加」をタップして完了",
        desc: "確認ダイアログで「追加」を押すと完了です",
        visual: (
          <div className="flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 p-3 mt-2">
            <div className="w-full max-w-[200px]">
              <div className="bg-gray-800 rounded-xl p-4 text-center space-y-3">
                <div className="w-12 h-12 bg-primary rounded-2xl mx-auto flex items-center justify-center overflow-hidden">
                  <img src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png" alt="ChatMarket" className="w-9 h-9 object-contain" />
                </div>
                <p className="text-xs text-gray-300">「ChatMarket」をホーム画面に追加しますか？</p>
                <div className="flex gap-2">
                  <button className="flex-1 text-xs bg-gray-700 rounded-lg py-1.5 text-gray-400">キャンセル</button>
                  <button className="flex-1 text-xs bg-primary rounded-lg py-1.5 text-primary-foreground font-bold">追加</button>
                </div>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: "chrome-ios",
    label: "Chrome（iPhone）",
    icon: "🌐",
    color: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    steps: [
      {
        icon: <Share className="w-5 h-5 text-blue-400" />,
        title: "共有ボタンをタップ",
        desc: "アドレスバー右の「↑」共有アイコンをタップ",
        visual: (
          <div className="flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 p-3 mt-2">
            <div className="w-full max-w-[200px]">
              <div className="bg-gray-800 rounded-lg p-2 flex items-center gap-2 text-xs text-gray-400">
                <Share className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="truncate flex-1">chatmarket.app</span>
                <MoreVertical className="w-4 h-4 shrink-0" />
              </div>
              <div className="flex justify-start mt-1 ml-1">
                <span className="text-[10px] text-yellow-400 font-semibold bg-yellow-400/10 px-2 py-0.5 rounded">← 共有をタップ</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        icon: <Plus className="w-5 h-5 text-green-400" />,
        title: "「ホーム画面に追加」を選択",
        desc: "シートをスクロールして「ホーム画面に追加」をタップ",
        visual: (
          <div className="flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 p-3 mt-2">
            <div className="w-full max-w-[200px] space-y-1">
              {["コピー", "ブックマーク追加", "リーディングリストに追加"].map((item) => (
                <div key={item} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg text-xs text-gray-400">
                  <div className="w-4 h-4 bg-gray-700 rounded" />
                  <span>{item}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/40 rounded-lg text-xs text-green-400 font-semibold">
                <Plus className="w-4 h-4" />
                <span>ホーム画面に追加</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        icon: <Home className="w-5 h-5 text-primary" />,
        title: "「追加」をタップして完了",
        desc: "右上の「追加」をタップしてホーム画面に追加",
        visual: (
          <div className="flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 p-3 mt-2">
            <div className="w-full max-w-[200px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-blue-400">キャンセル</span>
                <span className="text-xs font-semibold text-gray-300">ホーム画面に追加</span>
                <span className="text-xs text-blue-400 font-bold">追加</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                  📺
                </div>
                <span className="text-xs text-gray-300 font-medium">ChatMarket</span>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
];

export default function PwaInstallGuide() {
  const [activeTab, setActiveTab] = useState("safari-ios");
  const [expanded, setExpanded] = useState(true);

  const activeBrowser = browsers.find((b) => b.id === activeTab);

  return (
    <section className="py-4">
      <div
        className="bg-card border border-border/50 rounded-2xl overflow-hidden cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold">スマートフォンでアプリとして使う</h2>
              <p className="text-xs text-muted-foreground mt-0.5">ホーム画面に追加してアプリのように起動</p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border border-t-0 border-border/50 rounded-b-2xl bg-card/50 p-6 space-y-6">
          {/* Browser Tabs */}
          <div className="flex flex-wrap gap-2">
            {browsers.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveTab(b.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  activeTab === b.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                <span>{b.icon}</span>
                <span>{b.label}</span>
              </button>
            ))}
          </div>

          {/* Steps */}
          {activeBrowser && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {activeBrowser.steps.map((step, i) => (
                <div
                  key={i}
                  className={`relative rounded-2xl bg-gradient-to-br border p-5 flex flex-col ${activeBrowser.color}`}
                >
                  {/* Step number */}
                  <div className="absolute -top-3 left-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shadow">
                    {i + 1}
                  </div>

                  <div className="flex items-center gap-2 mt-1 mb-1">
                    {step.icon}
                    <h3 className="font-semibold text-sm">{step.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{step.desc}</p>
                  {step.visual}

                  {/* Arrow between steps */}
                  {i < activeBrowser.steps.length - 1 && (
                    <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 text-lg">
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            ホーム画面に追加すると、フルスクリーンでアプリのようにご利用いただけます 🎉
          </p>
        </div>
      )}
    </section>
  );
}