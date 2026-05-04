import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import StreamKeySecurityDisplay from "./StreamKeySecurityDisplay";

/**
 * StreamSetupCards
 * PC配信（OBS）・スマホ配信（Larix/Prism）を
 * 世界最高レベルのデザインで表示するカードコンポーネント
 */
export default function StreamSetupCards({ user, streamKey, ingestEndpoint, fullRtmpsUrl }) {
  const [activeTab, setActiveTab] = useState("pc");

  const tabs = [
    { id: "pc",     label: "PC 配信",     emoji: "🖥️", sub: "OBS Studio" },
    { id: "mobile", label: "スマホ配信",  emoji: "📱", sub: "Larix / Prism" },
  ];

  return (
    <div className="relative">
      {/* タブセレクター */}
      <div className="flex gap-2 mb-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 flex flex-col items-center gap-0.5 py-3 px-4 rounded-2xl font-black text-sm transition-all duration-200 border ${
              activeTab === tab.id
                ? tab.id === "pc"
                  ? "bg-[#10b981]/15 border-[#10b981]/60 text-[#10b981] shadow-lg shadow-[#10b981]/10"
                  : "bg-blue-500/15 border-blue-500/60 text-blue-400 shadow-lg shadow-blue-500/10"
                : "bg-zinc-900/60 border-zinc-700/50 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="text-xl leading-none">{tab.emoji}</span>
            <span className="text-xs font-black leading-none">{tab.label}</span>
            <span className="text-[9px] font-semibold opacity-70 leading-none">{tab.sub}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "pc" && (
          <motion.div
            key="pc"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* OBS カード */}
            <div className="relative overflow-hidden rounded-2xl border border-[#10b981]/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-[#10b981]/5">
              {/* ヘッダー帯 */}
              <div className="flex items-center gap-4 px-5 pt-5 pb-4 border-b border-[#10b981]/15">
                <div className="w-12 h-12 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-2xl shrink-0">
                  🖥️
                </div>
                <div>
                  <p className="font-black text-white text-base">OBS Studio</p>
                  <p className="text-[11px] text-[#10b981]/80 font-semibold">PC向け・プロ仕様配信ソフト</p>
                </div>
                <a
                  href="https://obsproject.com/download"
                  target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1.5 text-[10px] font-black bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] border border-[#10b981]/40 px-3 py-1.5 rounded-lg transition-all"
                >
                  ↓ 無料DL
                </a>
              </div>

              {/* 特徴チップ */}
              <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-zinc-800/50">
                {["高画質 FHD", "シーン切替", "ゲーム実況", "BGM対応", "Win/Mac"].map((f) => (
                  <span key={f} className="text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>

              {/* キー表示エリア */}
              <div className="px-5 py-4">
                <StreamKeySecurityDisplay
                  user={user}
                  streamKey={streamKey}
                  ingestEndpoint={ingestEndpoint}
                  isSmartphone={false}
                />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "mobile" && (
          <motion.div
            key="mobile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {/* Larix */}
            <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-500/5">
              <div className="flex items-center gap-4 px-5 pt-5 pb-4 border-b border-blue-500/15">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-2xl shrink-0">
                  📡
                </div>
                <div>
                  <p className="font-black text-white text-base">Larix Broadcaster</p>
                  <p className="text-[11px] text-blue-400/80 font-semibold">シンプル & 低遅延</p>
                </div>
                <div className="ml-auto flex gap-1.5">
                  <a href="https://apps.apple.com/app/larix-broadcaster/id1535549341" target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-black bg-black hover:bg-zinc-900 text-white border border-zinc-700 px-2.5 py-1.5 rounded-lg transition-all">
                    🍎 iOS
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=com.wmspanel.larix_broadcaster" target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-black bg-emerald-700/80 hover:bg-emerald-700 text-white border border-emerald-600 px-2.5 py-1.5 rounded-lg transition-all">
                    🤖 Android
                  </a>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 px-5 py-3 border-b border-zinc-800/50">
                {["無料", "低遅延", "安定性◎", "RTMPS対応", "シンプル設定"].map((f) => (
                  <span key={f} className="text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
              <div className="px-5 py-4">
                <StreamKeySecurityDisplay user={user} fullRtmpsUrl={fullRtmpsUrl} isSmartphone={true} />
              </div>
            </div>

            {/* Prism */}
            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-purple-500/5">
              <div className="flex items-center gap-4 px-5 pt-4 pb-3 border-b border-purple-500/15">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-xl shrink-0">
                  ✨
                </div>
                <div>
                  <p className="font-black text-white text-sm">Prism Live Studio</p>
                  <p className="text-[11px] text-purple-400/80 font-semibold">エフェクト重視・映え配信</p>
                </div>
                <div className="ml-auto flex gap-1">
                  <a href="https://apps.apple.com/app/prism-live-studio/id1486655309" target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-black bg-black hover:bg-zinc-900 text-white border border-zinc-700 px-2 py-1.5 rounded-lg transition-all">
                    🍎 iOS
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=com.prism.livestudio" target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-black bg-purple-700/60 hover:bg-purple-700 text-white border border-purple-600 px-2 py-1.5 rounded-lg transition-all">
                    🤖 Android
                  </a>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 px-5 py-2.5">
                {["美顔フィルター", "ステッカー", "バーチャル背景", "iOS/Android"].map((f) => (
                  <span key={f} className="text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/60 px-2 py-0.5 rounded-full">{f}</span>
                ))}
              </div>
              <div className="px-5 pb-4 pt-1">
                <p className="text-[11px] text-muted-foreground">上のLarixと同じURLを貼り付けて配信開始できます。設定 → Custom RTMPS → URLを貼り付け。</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}