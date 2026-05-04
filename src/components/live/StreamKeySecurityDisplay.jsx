import React, { useState } from "react";
import { Copy, AlertTriangle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * StreamKeySecurityDisplay
 * ストリームキー・サーバーURLの安全な表示コンポーネント
 * - 認証チェック
 * - コピーボタン主役（キーそのものは非表示）
 * - 漏洩警告文を大きく表示
 */
export default function StreamKeySecurityDisplay({ user, streamKey, ingestEndpoint, fullRtmpsUrl, isSmartphone = false }) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // 認証ガード
  if (!user) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-sm font-bold text-red-400">ログインが必要です</p>
        </div>
        <p className="text-xs text-red-300">ストリームキーは認証されたユーザーのみアクセス可能です。</p>
      </div>
    );
  }

  // キー未取得
  if (!streamKey || !ingestEndpoint) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
        <p className="text-xs text-yellow-400 font-semibold">配信スタートを押すとキーが表示されます</p>
      </div>
    );
  }

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}をコピーしました`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── スマホアプリ用（完全RTMPS URL） ──
  if (isSmartphone) {
    return (
      <div className="space-y-4">
        {/* 警告バナー（重要） */}
        <div className="bg-red-500/15 border-l-4 border-red-500 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-red-500 text-sm">⚠️ セキュリティ警告</p>
              <p className="text-xs text-red-400 mt-1">
                このURLが第三者に漏洩すると、<span className="font-bold">あなたの配信を乗っ取られます</span>。
                <br />SNS・スクリーンショア共有・チャットで絶対に公開しないでください。
              </p>
            </div>
          </div>
        </div>

        {/* コピーボタン主役 */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-green-400 uppercase tracking-widest">
            📋 アプリ用URL（クリックでコピー）
          </label>
          <Button
            type="button"
            onClick={() => handleCopy(fullRtmpsUrl, "スマホ用URL")}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-black flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Copy className="w-5 h-5" />
            {copied ? "✅ コピー完了" : "クリックしてコピー"}
          </Button>
        </div>

        {/* オプション：キーを見る */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showKey ? "キーを隠す" : "キーを表示（確認用）"}
          </button>
          {showKey && (
            <div className="bg-zinc-900/80 border border-red-500/30 rounded-lg p-3 space-y-1.5">
              <p className="text-[10px] text-red-400 font-bold">URL全文：</p>
              <div className="font-mono text-[10px] text-zinc-300 break-all bg-black/50 rounded p-2 max-h-20 overflow-y-auto">
                {fullRtmpsUrl}
              </div>
              <p className="text-[10px] text-red-400">⚠️ このテキストをコピペしないでください — 上のボタンを使ってください</p>
            </div>
          )}
        </div>

        {/* インストール手順 */}
        <div className="bg-zinc-900/50 rounded-lg p-3 border border-green-500/20 space-y-2">
          <p className="text-xs font-bold text-white">使い方（3ステップ）：</p>
          <ol className="space-y-1 text-xs text-muted-foreground">
            <li>
              <span className="font-bold text-green-400">1.</span> アプリをインストール
            </li>
            <li>
              <span className="font-bold text-green-400">2.</span> 「+」→「RTMPS」を選択
            </li>
            <li>
              <span className="font-bold text-green-400">3.</span> ↑のボタンでコピーしたURLを貼り付けて「Go Live」
            </li>
          </ol>
        </div>
      </div>
    );
  }

  // ── PC OBS用（サーバーURL + ストリームキー分離） ──
  return (
    <div className="space-y-4">
      {/* 警告バナー（重要） */}
      <div className="bg-red-500/15 border-l-4 border-red-500 rounded-lg p-4 space-y-2">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-red-500 text-sm">⚠️ セキュリティ警告</p>
            <p className="text-xs text-red-400 mt-1">
              ストリームキーが第三者に漏洩すると、<span className="font-bold">あなたの配信を乗っ取られます</span>。
              <br />SNS・スクリーンショア共有・配信中の画面録画で絶対に公開しないでください。
            </p>
          </div>
        </div>
      </div>

      {/* サーバーURL */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-primary uppercase tracking-widest">
          📡 サーバーURL
        </label>
        <Button
          type="button"
          onClick={() => handleCopy(`rtmps://${ingestEndpoint}:443/app/`, "サーバーURL")}
          className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-black flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Copy className="w-4 h-4" />
          クリックしてコピー
        </Button>
      </div>

      {/* ストリームキー */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-red-500 uppercase tracking-widest">
          🔑 ストリームキー（最機密）
        </label>
        <Button
          type="button"
          onClick={() => handleCopy(streamKey, "ストリームキー")}
          className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-black flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Copy className="w-4 h-4" />
          クリックしてコピー
        </Button>
        {copied && (
          <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> コピー完了 — OBSに貼り付けてください
          </div>
        )}
      </div>

      {/* オプション：キーを見る */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showKey ? "キーを隠す" : "キーを表示（確認用）"}
        </button>
        {showKey && (
          <div className="bg-zinc-900/80 border border-red-500/30 rounded-lg p-3 space-y-2">
            <div className="space-y-1.5">
              <p className="text-[10px] text-primary font-bold">Server URL全文：</p>
              <div className="font-mono text-[10px] text-zinc-300 break-all bg-black/50 rounded p-2">
                rtmps://{ingestEndpoint}:443/app/
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] text-red-500 font-bold">Stream Key全文：</p>
              <div className="font-mono text-[10px] text-zinc-300 break-all bg-black/50 rounded p-2 max-h-16 overflow-y-auto">
                {streamKey}
              </div>
            </div>
            <p className="text-[10px] text-red-400">⚠️ このテキストをコピペしないでください — 上のボタンを使ってください</p>
          </div>
        )}
      </div>

      {/* OBS設定ガイド */}
      <a
        href="/obs-guide"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold underline underline-offset-2"
      >
        → OBS設定ガイド
      </a>
    </div>
  );
}