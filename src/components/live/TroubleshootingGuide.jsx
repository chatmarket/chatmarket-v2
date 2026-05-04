import React, { useState } from "react";
import { ChevronDown, AlertCircle, Wifi, Maximize2, Volume2, Settings } from "lucide-react";

/**
 * TroubleshootingGuide
 * よくあるトラブルと対処法（初心者向け）
 */
export default function TroubleshootingGuide() {
  const [expandedId, setExpandedId] = useState(null);

  const troubles = [
    {
      id: "black-screen",
      icon: <Maximize2 className="w-5 h-5" />,
      title: "画面が真っ黒のまま配信されている",
      solutions: [
        "OBS を開いて、左下の『ソース』に「画面キャプチャ」「ウィンドウキャプチャ」「ゲーム」など、映したいものが追加されているか確認してください",
        "追加されていたら、その項目をクリックして『有効』になっているか確認してください",
        "スマホ/Larix の場合は、カメラが正しく選択されているか確認。アプリの設定から『カメラ』を選び直してください"
      ]
    },
    {
      id: "connection-error",
      icon: <Wifi className="w-5 h-5" />,
      title: "『接続できない』『サーバーが見つからない』というエラーが出る",
      solutions: [
        "インターネット接続を確認してください。WiFi か有線で安定した接続があるか確認",
        "OBS の場合、ストリームキーが正しくコピーされたか確認。URLとキーが両方あるか、スペースが余分に入っていないか見直してください",
        "ファイアウォール（セキュリティソフト）が OBS をブロックしていないか確認。ブロックされていたら許可に変更してください",
        "数分待って再度接続を試してみてください。サーバーが一時的に応答していないこともあります"
      ]
    },
    {
      id: "no-audio",
      icon: <Volume2 className="w-5 h-5" />,
      title: "映像は出るけど音が聞こえない",
      solutions: [
        "OBS / Larix で『音声入力』『マイク』が追加されているか確認",
        "マイク・スピーカーのボリュームが上がっているか確認（PCやスマホの側でも確認）",
        "『ミュート』になっていないか確認。アプリの画面で『🔊』『ミュート』ボタンをチェック",
        "違うマイクが選択されていないか確認。設定から正しいマイクを選び直してください"
      ]
    },
    {
      id: "lag-freezing",
      icon: <Settings className="w-5 h-5" />,
      title: "配信がカクカク止まったり、遅れている",
      solutions: [
        "インターネットの速度を確認。配信には『上り』速度が重要です（下り速度ではなく）",
        "WiFi を使っている場合、ルーターに近いところに移動してください",
        "OBS で『画質を下げる』『ビットレートを下げる』を試してください（設定 → 配信から変更可能）",
        "他のアプリや YouTube などが同時に実行していないか確認。閉じてから配信を再開してください"
      ]
    },
    {
      id: "url-not-working",
      icon: <AlertCircle className="w-5 h-5" />,
      title: "スマホアプリに URL を貼り付けたのに『無効な URL』と言われる",
      solutions: [
        "URL の最後に余分なスペースが入っていないか確認。最後の文字の直後に何もないことを確認",
        "URL 全体をもう一度コピーしてください。一部だけコピーされているかもしれません",
        "アプリを一度閉じて再度開き直してからペーストしてください",
        "別のテキストエディタ（メモアプリなど）に一度貼り付けて、URL が正しく入っているか目視で確認してください"
      ]
    },
    {
      id: "low-bitrate",
      icon: <Wifi className="w-5 h-5" />,
      title: "画面の画質が悪い（ぼやけている）",
      solutions: [
        "インターネット接続が弱くないか確認。別の場所で試してみてください",
        "OBS で『ビットレート』を上げてください（設定 → 配信 → ビットレート）。3000〜6000 kbps で試してください",
        "OBS で『解像度』を確認。1280×720 または 1920×1080 が推奨です",
        "スマホ / Larix の場合は、カメラの向きを『風景モード』にしてください"
      ]
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-5 h-5 text-orange-500" />
        <h2 className="text-lg font-black text-white">よくあるトラブル</h2>
      </div>

      <div className="space-y-2">
        {troubles.map((trouble) => (
          <div key={trouble.id} className="bg-zinc-900/70 border border-zinc-700/50 rounded-lg overflow-hidden">
            {/* ヘッダー */}
            <button
              onClick={() => setExpandedId(expandedId === trouble.id ? null : trouble.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-orange-500 shrink-0">{trouble.icon}</span>
                <p className="text-sm font-semibold text-white">{trouble.title}</p>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                  expandedId === trouble.id ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* 詳細内容 */}
            {expandedId === trouble.id && (
              <div className="px-4 py-3 bg-zinc-900/30 border-t border-zinc-700/30 space-y-2.5">
                {trouble.solutions.map((solution, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="text-orange-500 font-black text-sm shrink-0 mt-0.5">
                      {idx + 1}.
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">{solution}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 底部ヒント */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-1">
        <p className="text-xs font-bold text-blue-400">💡 それでも解決しない場合</p>
        <p className="text-[11px] text-blue-300/80">
          配信を一度終了して、アプリ・OBS・PCを再起動することで解決することがほとんどです。
        </p>
      </div>
    </div>
  );
}