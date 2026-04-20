import React, { useState } from "react";
import { Radio, Video, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

/**
 * ラジオモード切り替えボタン
 * ゲーム配信 ↔ ラジオ配信を瞬時に切り替え
 * 
 * ①映像送信の停止（静止画への切り替え）
 * ②音声ビットレートの最適化（64kbpsへ）
 * ③15分タイマーのリセット + 50コイン課金予約の有効化
 */
export default function RadioModeToggle({
  isRadioMode,
  onToggle,
  isProcessing = false,
  staticImageUrl = null,
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = async () => {
    if (!onToggle) return;
    
    try {
      await onToggle();
      const newMode = !isRadioMode;
      const message = newMode 
        ? "ラジオモード ON 📻 - 映像送信停止 + 音声最適化（64kbps）"
        : "ゲーム配信モード ON 🎮 - 映像＆音声フル出力";
      toast.success(message);
      setShowConfirm(false);
    } catch (err) {
      toast.error("モード切り替えに失敗: " + err.message);
    }
  };

  return (
    <>
      {/* 切り替えボタン */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={isProcessing}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
          isRadioMode
            ? "bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30"
            : "bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isRadioMode ? "ゲーム配信に戻す" : "ラジオモードに切り替え"}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isRadioMode ? (
          <Radio className="w-4 h-4" />
        ) : (
          <Video className="w-4 h-4" />
        )}
        <span>
          {isProcessing ? "処理中..." : isRadioMode ? "📻 ラジオ中" : "🎮 ゲーム配信"}
        </span>
      </button>

      {/* 確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                {isRadioMode ? (
                  <Video className="w-5 h-5 text-blue-400" />
                ) : (
                  <Radio className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div>
                <h2 className="font-black text-white text-lg">
                  {isRadioMode ? "ゲーム配信に戻しますか？" : "ラジオモードに切り替えますか？"}
                </h2>
                <p className="text-zinc-400 text-xs mt-1">
                  {isRadioMode
                    ? "映像を復活させます"
                    : "映像を停止し、音声に特化します"}
                </p>
              </div>
            </div>

            {/* 変更内容 */}
            <div className="bg-zinc-800 rounded-xl p-4 mb-4 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">
                  {isRadioMode ? "✅" : "📻"}
                </span>
                <div>
                  <p className="text-zinc-300 font-bold mb-0.5">
                    映像: {isRadioMode ? "復活" : "停止（静止画に）"}
                  </p>
                  <p className="text-zinc-500 text-[10px]">
                    {isRadioMode
                      ? "ゲーム画面が表示されます"
                      : "プロフィール画像または静止画が表示"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">🎵</span>
                <div>
                  <p className="text-zinc-300 font-bold mb-0.5">
                    音声: {isRadioMode ? "フル音質" : "最適化（64kbps）"}
                  </p>
                  <p className="text-zinc-500 text-[10px]">
                    {isRadioMode
                      ? "映像+音声フルビットレート"
                      : "低帯域で安定配信"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⏱️</span>
                <div>
                  <p className="text-zinc-300 font-bold mb-0.5">
                    15分課金: {isRadioMode ? "リセット" : "リセット"}
                  </p>
                  <p className="text-zinc-500 text-[10px]">
                    タイマーと50コイン予約が新規スタート
                  </p>
                </div>
              </div>
            </div>

            {/* 注意 */}
            <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <p className="text-orange-300 text-xs leading-relaxed">
                視聴者の接続が一時的に途切れる可能性があります
              </p>
            </div>

            {/* ボタン */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleToggle}
                disabled={isProcessing}
                className={`flex-1 py-3 rounded-xl text-white font-black text-sm transition-colors disabled:opacity-50 ${
                  isRadioMode
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {isProcessing ? "処理中..." : isRadioMode ? "🎮 ゲーム配信に" : "📻 ラジオモードに"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}