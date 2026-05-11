import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Monitor, Smartphone, Check } from "lucide-react";

export default function BroadcasterSetupGuide() {
  const [expanded, setExpanded] = useState("obs");

  const guides = {
    obs: {
      name: "OBS Studio",
      icon: Monitor,
      steps: [
        {
          num: "1",
          title: "「設定」を開く",
          details: "OBS画面上部メニューから「設定」をクリック",
        },
        {
          num: "2",
          title: "「配信」タブを選択",
          details: "左側メニューから「配信」を選択",
        },
        {
          num: "3",
          title: "「配信サービス」で「カスタム」を選択",
          details: "ドロップダウンから「カスタム」を選択",
        },
        {
          num: "4",
          title: "Server と Stream Key を貼り付け",
          details: "上記のServer URLとStream Keyをそれぞれ貼り付け",
        },
        {
          num: "5",
          title: "出力設定を確認",
          details: "左側の「出力」タブでビットレートとキーフレーム間隔を設定",
        },
      ],
      settings: [
        { label: "ビットレート（推奨）", value: "2500-4000 Kbps", bold: true },
        { label: "キーフレーム間隔（固定）", value: "2秒", bold: true },
        { label: "エンコーダ", value: "H.264 / x264", bold: false },
        { label: "プロファイル", value: "Main / High", bold: false },
      ],
    },
    prism: {
      name: "Prism Live Studio",
      icon: Smartphone,
      steps: [
        {
          num: "1",
          title: "アプリを開いて「配信設定」をタップ",
          details: "アプリのメイン画面から「配信設定」を選択",
        },
        {
          num: "2",
          title: "「Custom RTMPS」を選択",
          details: "配信先の種類から「Custom RTMPS」をタップ",
        },
        {
          num: "3",
          title: "Server URLと Stream Key を入力",
          details: "上記のURLを「URL」フィールドに貼り付け",
        },
        {
          num: "4",
          title: "ビットレートを設定",
          details: "詳細設定からビットレートを調整",
        },
        {
          num: "5",
          title: "「配信開始」をタップ",
          details: "準備完了 — 配信スタート！",
        },
      ],
      settings: [
        { label: "ビットレート（推奨）", value: "2000-3500 Kbps", bold: true },
        { label: "キーフレーム間隔（固定）", value: "2秒", bold: true },
        { label: "解像度", value: "720p〜1080p", bold: false },
        { label: "フレームレート", value: "30fps 〜 60fps", bold: false },
      ],
    },
  };

  const current = guides[expanded];
  const Icon = current.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-primary rounded-full" />
        <h2 className="text-base font-black text-white uppercase tracking-wider">
          📡 配信アプリ設定ガイド
        </h2>
      </div>

      {/* タブセレクター */}
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(guides).map(([key, guide]) => {
          const TabIcon = guide.icon;
          return (
            <button
              key={key}
              onClick={() => setExpanded(key)}
              className={`relative overflow-hidden rounded-xl border-2 p-4 transition-all ${
                expanded === key
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-zinc-700 bg-zinc-900/60 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <TabIcon className="w-5 h-5" />
                <span className="font-black text-sm">{guide.name}</span>
              </div>
              {expanded === key && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* コンテンツ */}
      <AnimatePresence mode="wait">
        <motion.div
          key={expanded}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-4"
        >
          {/* 推奨設定 */}
          <div className="bg-gradient-to-r from-amber-950/40 to-amber-900/20 border border-amber-500/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-black text-amber-300 uppercase tracking-widest">⚙️ 推奨設定</p>
            <div className="space-y-1.5">
              {current.settings.map((setting, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">{setting.label}</span>
                  <span className={`font-mono ${setting.bold ? "font-black text-amber-300" : "text-amber-100"}`}>
                    {setting.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ステップガイド */}
          <div className="bg-zinc-900/60 border border-zinc-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950">
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">📋 設定手順</p>
            </div>
            <div className="p-4 space-y-3">
              {current.steps.map((step) => (
                <div key={step.num} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-xs shrink-0">
                    {step.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white">{step.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{step.details}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 確認チェックリスト */}
          <div className="bg-green-950/30 border border-green-500/30 rounded-xl p-4 space-y-2">
            <p className="text-xs font-black text-green-400 uppercase tracking-widest">✅ 配信前チェックリスト</p>
            <div className="space-y-1.5 text-xs text-green-200/80">
              {[
                "WiFi または 有線 LAN で接続している",
                `ビットレートを推奨値に設定した`,
                "キーフレーム間隔が 2秒に設定されている",
                "マイク・カメラのアクセス許可を確認した",
                "試し配信で映像が映ること確認した",
              ].map((item, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}