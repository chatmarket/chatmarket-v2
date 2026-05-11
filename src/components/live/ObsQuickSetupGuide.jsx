/**
 * === ObsQuickSetupGuide ===
 * OBS/PRISM向けの『一度設定すればOK』簡潔セットアップガイド
 * 配信前に「これだけやれば終わり」の手順を表示
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ChevronDown, Monitor, Smartphone, ZapOff } from "lucide-react";
import { toast } from "sonner";

export default function ObsQuickSetupGuide({ streamKey, ingestEndpoint, streamId }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const rtmpsUrl = `rtmps://${ingestEndpoint}:443/app/`;
  const fullRtmpsUrl = `rtmps://${ingestEndpoint}:443/app/${streamKey}`;

  const copyToClip = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("コピーしました");
  };

  return (
    <motion.div
      layout
      className="bg-gradient-to-r from-blue-950 to-blue-900 border-2 border-blue-500/50 rounded-2xl overflow-hidden shadow-xl"
    >
      {/* ヘッダー（常時表示） */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-blue-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/50 flex items-center justify-center shrink-0">
            <Monitor className="w-5 h-5 text-blue-300" />
          </div>
          <div className="text-left">
            <p className="text-sm font-black text-blue-200 uppercase tracking-widest">OBS / PRISM 設定</p>
            <p className="text-xs text-blue-300/70">一度設定すればOK！</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-blue-300" />
        </motion.div>
      </button>

      {/* 展開コンテンツ */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-blue-500/30"
          >
            <div className="px-5 py-4 space-y-4 bg-blue-900/30">
              {/* 概要 */}
              <div className="bg-blue-950/60 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-200 leading-relaxed">
                  🎯 下の2つをコピーして「設定」に貼り付けるだけ。以降は毎回同じ設定で配信できます。
                </p>
              </div>

              {/* ステップ1: Server URL */}
              <div className="space-y-1.5 bg-black/40 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">① Server URL</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    readOnly
                    value={rtmpsUrl}
                    className="flex-1 bg-zinc-950 border border-blue-500/40 rounded px-2 py-2 text-xs text-zinc-300 font-mono"
                  />
                  <button
                    onClick={() => copyToClip(rtmpsUrl, 1)}
                    className={`shrink-0 px-2.5 py-2 rounded text-xs font-bold transition-all ${
                      copiedIndex === 1
                        ? "bg-green-500/30 text-green-300"
                        : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-300"
                    }`}
                  >
                    {copiedIndex === 1 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* ステップ2: Stream Key */}
              <div className="space-y-1.5 bg-black/40 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">② Stream Key</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    readOnly
                    value={streamKey}
                    className="flex-1 bg-zinc-950 border border-blue-500/40 rounded px-2 py-2 text-xs text-zinc-300 font-mono truncate"
                  />
                  <button
                    onClick={() => copyToClip(streamKey, 2)}
                    className={`shrink-0 px-2.5 py-2 rounded text-xs font-bold transition-all ${
                      copiedIndex === 2
                        ? "bg-green-500/30 text-green-300"
                        : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-300"
                    }`}
                  >
                    {copiedIndex === 2 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* OBS手順 */}
              <div className="bg-zinc-950/50 border border-blue-500/20 rounded-lg p-3 space-y-2">
                <p className="text-xs font-bold text-blue-200">OBS Studio 手順:</p>
                <ol className="space-y-1 text-xs text-blue-100/80">
                  <li>1. 「設定」→「配信」を開く</li>
                  <li>2. 「サービス」で「カスタム」を選択</li>
                  <li>3. 上の①をServer URLに、②をStream Keyに貼り付け</li>
                  <li>4. 「適用」→「OK」</li>
                  <li>5. 配信開始ボタンをクリック → 以上！</li>
                </ol>
              </div>

              {/* PRISM手順 */}
              <div className="bg-zinc-950/50 border border-blue-500/20 rounded-lg p-3 space-y-2">
                <p className="text-xs font-bold text-blue-200">Prism Live Studio 手順:</p>
                <ol className="space-y-1 text-xs text-blue-100/80">
                  <li>1. 「設定」→「配信先」を開く</li>
                  <li>2. 上の①②を貼り付け</li>
                  <li>3. 「配信開始」を押す → 完了！</li>
                </ol>
              </div>

              {/* 重要な注意 */}
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3 flex gap-2">
                <ZapOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/80">
                  💡 <strong>このキーは永久に有効です</strong>。毎回設定する必要はありません。一度設定したら、ずっと同じ設定で配信できます。
                </p>
              </div>

              {/* Web Overlay（PRISM専用） */}
              <div className="bg-purple-950/40 border border-purple-500/30 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-bold text-purple-300">✨ PRISM Web Overlay（オプション）</p>
                <p className="text-[10px] text-purple-200/70 mb-2">
                  チャットやエール通知をスマホ画面に表示したい場合:
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/prism-overlay/${streamId}`}
                    className="flex-1 bg-zinc-950 border border-purple-500/40 rounded px-2 py-2 text-xs text-zinc-300 font-mono truncate"
                  />
                  <button
                    onClick={() => copyToClip(`${window.location.origin}/prism-overlay/${streamId}`, 3)}
                    className={`shrink-0 px-2.5 py-2 rounded text-xs font-bold transition-all ${
                      copiedIndex === 3
                        ? "bg-green-500/30 text-green-300"
                        : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-300"
                    }`}
                  >
                    {copiedIndex === 3 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}