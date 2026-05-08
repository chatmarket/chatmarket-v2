import React from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * RTMP 認証情報表示コンポーネント
 * 社長（配信者）がスマホに持ってPRISMに入力するべき情報を表示
 */
export default function RtmpCredentialsDisplay({ streamId, ingestEndpoint, streamKey }) {
  if (!streamKey || !ingestEndpoint) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">配信を開始して RTMP 認証情報を取得してください</p>
      </div>
    );
  }

  const serverUrl = `rtmps://${ingestEndpoint}:443/app/`;
  const overlayUrl = `${window.location.origin}/prism-overlay/${streamId}`;

  const copyToClipboard = (text, message) => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  return (
    <div className="space-y-4">
      {/* ① サーバーURL */}
      <div className="bg-gradient-to-r from-purple-500/10 to-purple-400/5 border border-purple-500/30 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-purple-500 text-white font-black text-sm flex items-center justify-center">①</span>
          <p className="font-bold text-white">配信先（Server URL）</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            readOnly
            value={serverUrl}
            className="flex-1 bg-black/30 border border-purple-500/40 rounded-lg px-3 py-2.5 text-xs text-purple-200 font-mono break-all"
          />
          <button
            onClick={() => copyToClipboard(serverUrl, "✅ Server URL をコピーしました")}
            className="shrink-0 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
        <p className="text-xs text-purple-300/70">PRISM の「RTMPサーバー」に貼り付け</p>
      </div>

      {/* ② ストリームキー */}
      <div className="bg-gradient-to-r from-blue-500/10 to-blue-400/5 border border-blue-500/30 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-500 text-white font-black text-sm flex items-center justify-center">②</span>
          <p className="font-bold text-white">ストリームキー（Stream Key）</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            readOnly
            value={streamKey}
            className="flex-1 bg-black/30 border border-blue-500/40 rounded-lg px-3 py-2.5 text-xs text-blue-200 font-mono break-all"
          />
          <button
            onClick={() => copyToClipboard(streamKey, "✅ Stream Key をコピーしました")}
            className="shrink-0 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
        <p className="text-xs text-blue-300/70">PRISM の「ストリームキー」に貼り付け</p>
      </div>

      {/* ③ チャットオーバーレイ URL */}
      <div className="bg-gradient-to-r from-green-500/10 to-green-400/5 border border-green-500/30 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-green-500 text-white font-black text-sm flex items-center justify-center">③</span>
          <p className="font-bold text-white">チャットオーバーレイ URL</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            readOnly
            value={overlayUrl}
            className="flex-1 bg-black/30 border border-green-500/40 rounded-lg px-3 py-2.5 text-xs text-green-200 font-mono break-all"
          />
          <button
            onClick={() => copyToClipboard(overlayUrl, "✅ Overlay URL をコピーしました")}
            className="shrink-0 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
          >
            <Copy className="w-3 h-3" /> Copy
          </button>
        </div>
        <p className="text-xs text-green-300/70">PRISM の「Web Overlay」に貼り付け（チャットと投げ銭が表示されます）</p>
      </div>

      {/* 接続成功インジケーター */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl p-3 flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
        <div>
          <p className="text-sm font-bold text-white">✅ 配信準備完了！</p>
          <p className="text-xs text-emerald-100">PRISM に ① と ② をコピペして「配信開始」を押してください</p>
        </div>
      </div>
    </div>
  );
}