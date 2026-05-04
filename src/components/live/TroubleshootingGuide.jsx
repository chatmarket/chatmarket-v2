import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TROUBLES = [
  {
    id: "black",
    emoji: "⬛",
    title: "画面が真っ黒",
    short: "映像が映らない",
    solutions: [
      "OBS の「ソース」に画面キャプチャ・ウィンドウキャプチャを追加してください",
      "スマホ側でカメラ許可を与えているか確認",
      "OBS を管理者権限で起動し直してください",
    ],
  },
  {
    id: "connect",
    emoji: "📡",
    title: "接続エラー",
    short: "サーバーが見つからない",
    solutions: [
      "WiFi・有線ケーブル接続か確認してください",
      "ストリームキーを再コピーして貼り直してください",
      "セキュリティソフトが OBS をブロックしている可能性あり → 許可設定へ",
    ],
  },
  {
    id: "audio",
    emoji: "🔇",
    title: "音が出ない",
    short: "視聴者に声が届かない",
    solutions: [
      "OBS の「音声ミキサー」でマイクがミュートになっていないか確認",
      "PC のシステム設定で、正しいマイクが選択されているか確認",
      "マイクを差し直して OBS を再起動してみてください",
    ],
  },
  {
    id: "lag",
    emoji: "🐢",
    title: "カクカク・遅延",
    short: "映像が止まる・ラグ大",
    solutions: [
      "インターネットの上り速度を確認（推奨：5Mbps 以上）",
      "WiFi ではなく有線 LAN ケーブルに切り替えてください",
      "OBS でビットレートを下げる（設定 → 配信 → 3000〜4000kbps）",
    ],
  },
  {
    id: "url",
    emoji: "🔗",
    title: "URL が無効",
    short: "スマホにペーストしても弾かれる",
    solutions: [
      "URL の先頭・末尾に余分なスペースが入っていないか確認",
      "もう一度「クリックしてコピー」ボタンから取得し直してください",
      "メモアプリに一度貼り付けて確認 → 再度アプリにペースト",
    ],
  },
  {
    id: "cpu",
    emoji: "⚙️",
    title: "CPU 使用率が高い",
    short: "配信中に PC が重くなる",
    solutions: [
      "他のアプリを閉じてください（ブラウザ、Discord など）",
      "OBS の設定 → 出力 → エンコーダを『GPU（NVIDIA/AMD）』に変更",
      "解像度を 1080p から 720p に落とすか、フレームレートを 30fps に変更",
    ],
  },
  {
    id: "camera",
    emoji: "📷",
    title: "カメラが認識されない",
    short: "OBS にカメラが映らない",
    solutions: [
      "USB カメラは別の USB ポートに挿し直してください",
      "Windows 設定 → プライバシーとセキュリティ → カメラで、OBS に許可を与えてください",
      "カメラのドライバを最新版に更新してください",
    ],
  },
  {
    id: "bitrate",
    emoji: "📊",
    title: "ビットレート不足",
    short: "画質がすぐ悪くなる",
    solutions: [
      "インターネットの上り速度を確認（speedtest.net などで測定）",
      "OBS の設定 → 出力 → ビットレートを現在の速度に合わせて調整（推奨：上り速度の 60%）",
      "有線 LAN に切り替えてください（WiFi より安定性が高い）",
    ],
  },
];

export default function TroubleshootingGuide() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="space-y-2">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">⚡</span>
        <p className="text-sm font-black text-white tracking-wide">よくあるトラブル</p>
        <span className="text-[10px] font-semibold text-muted-foreground border border-zinc-700 rounded-full px-2 py-0.5 ml-auto">
          {TROUBLES.length} 件
        </span>
      </div>

      {TROUBLES.map((t) => (
        <div key={t.id}>
          <button
            onClick={() => setOpenId(openId === t.id ? null : t.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
              openId === t.id
                ? "bg-orange-500/10 border-orange-500/40 shadow-sm"
                : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900"
            }`}
          >
            <span className="text-base shrink-0">{t.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-black leading-none ${openId === t.id ? "text-orange-400" : "text-white"}`}>{t.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{t.short}</p>
            </div>
            <span className={`text-muted-foreground transition-transform shrink-0 ${openId === t.id ? "rotate-180" : ""}`} style={{ fontSize: 10 }}>▼</span>
          </button>

          <AnimatePresence>
            {openId === t.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-3 bg-zinc-900/40 border border-t-0 border-orange-500/20 rounded-b-xl space-y-2">
                  {t.solutions.map((s, i) => (
                    <div key={i} className="flex gap-2.5">
                      <span className="text-orange-400 font-black text-[11px] shrink-0 mt-0.5">{i + 1}.</span>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">{s}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      {/* フッター */}
      <div className="mt-3 flex items-start gap-2 bg-blue-500/8 border border-blue-500/20 rounded-xl px-3 py-2.5">
        <span className="text-sm shrink-0">💡</span>
        <p className="text-[10px] text-blue-300/80 leading-relaxed">
          解決しない場合はアプリ・OBS・PC を<strong className="text-blue-300">再起動</strong>するだけで直ることがほとんどです。
        </p>
      </div>
    </div>
  );
}