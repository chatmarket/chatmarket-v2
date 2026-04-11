import React from "react";
import { Link } from "react-router-dom";
import { Camera, Monitor, Mic2, X, Zap, Trophy } from "lucide-react";

export default function StreamStyleModal({ onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-black text-white">配信スタイルを選択</h2>
            <p className="text-zinc-500 text-sm mt-0.5">用途に合わせて配信方法を選んでください</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Panels */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800">
          {/* Left: Browser */}
          <div className="flex flex-col p-6 gap-5 group hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full mb-1">
                  <Zap className="w-3 h-3" /> かんたん
                </span>
                <h3 className="font-black text-white text-base leading-tight">ブラウザから手軽に配信<br /><span className="text-zinc-400 text-sm font-normal">（Webカメラ）</span></h3>
              </div>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed flex-1">
              専用ソフト不要。スマホやPCのカメラを使って、今すぐ簡単にライブ配信をスタートできます。雑談やちょっとした配信に最適です。
            </p>

            <ul className="space-y-1.5 text-xs text-zinc-500">
              {["アプリ・ソフト不要", "スマホ・PCどちらでもOK", "すぐに配信スタート"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{t}
                </li>
              ))}
            </ul>

            <button
              onClick={() => onSelect("webrtc")}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm transition-colors"
            >
              ブラウザ配信を選ぶ
            </button>
          </div>

          {/* Right: OBS/RTMP */}
          <div className="flex flex-col p-6 gap-5 group hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                <Monitor className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full mb-1">
                  <Trophy className="w-3 h-3" /> 本格配信
                </span>
                <h3 className="font-black text-white text-base leading-tight">OBS・専用ソフトで本格配信<br /><span className="text-zinc-400 text-sm font-normal">（RTMP）</span></h3>
              </div>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed flex-1">
              OBS Studio等の外部ソフトを使用します。複数カメラの切り替えや高音質マイク、テロップを活用したプロ仕様の音楽ライブやゲーム実況に最適です。
            </p>

            <ul className="space-y-1.5 text-xs text-zinc-500">
              {["高画質・高音質配信", "複数カメラ・テロップ対応", "ゲーム実況・音楽ライブ向け"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />{t}
                </li>
              ))}
            </ul>

            <button
              onClick={() => onSelect("rtmp")}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm transition-colors"
            >
              OBS配信を選ぶ
            </button>
            <Link
              to="/obs-guide"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-zinc-500 hover:text-purple-400 underline underline-offset-2 transition-colors"
            >
              ※ OBSの設定方法がわからない方はこちら
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}