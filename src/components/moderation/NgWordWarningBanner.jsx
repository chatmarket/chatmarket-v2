import React, { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * チャット送信時に NG ワードを検出したときの警告バナー
 * ユーザーに何がダメなのかを明確にして、学習させる
 */
export default function NgWordWarningBanner({ ngWord, onDismiss, onTryAgain }) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-3 space-y-2">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-300">メッセージが送信できません</p>
          <p className="text-xs text-red-300/70 mt-1">
            NG ワード「<span className="font-mono font-bold">{ngWord}</span>」が含まれています
          </p>
          {showDetail && (
            <p className="text-xs text-red-300/60 mt-2 leading-relaxed">
              プラットフォームのコミュニティガイドに違反する可能性のあるワードが検出されました。別の表現をお試しください。
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-red-400/60 hover:text-red-400 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 justify-between items-center">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="text-xs text-red-400 hover:text-red-300 underline transition-colors"
        >
          {showDetail ? "詳細を非表示" : "詳細を表示"}
        </button>
        <Button
          size="sm"
          variant="outline"
          onClick={onTryAgain}
          className="text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
        >
          別の表現で送信
        </Button>
      </div>
    </div>
  );
}