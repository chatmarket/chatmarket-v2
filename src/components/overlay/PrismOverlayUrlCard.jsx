import React, { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * PrismOverlayUrlCard
 * ライバーの管理画面に表示する「PRISM用オーバーレイURL」コピーカード
 * channelId を渡すだけで永久固定URLを表示する
 */
export default function PrismOverlayUrlCard({ channelId }) {
  const [copied, setCopied] = useState(false);

  if (!channelId) return null;

  const overlayUrl = `${window.location.origin}/prism-overlay/${channelId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    toast.success("✅ オーバーレイURLをコピーしました！\nPRISMの「Web Overlay」に貼り付けてください");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-gradient-to-r from-green-950 to-green-900 border-2 border-green-500/60 rounded-2xl p-5 shadow-lg">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 border border-green-500/40 flex items-center justify-center shrink-0">
          <span className="text-xl">🎯</span>
        </div>
        <div>
          <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">PRISM / OBS 用</p>
          <h3 className="text-sm font-black text-white">オーバーレイURL（永久固定）</h3>
          <p className="text-[10px] text-green-300/70">配信のたびに変わりません — コピペで完了</p>
        </div>
      </div>

      {/* URLボックス */}
      <div className="flex gap-2 items-center mb-3">
        <input
          type="text"
          readOnly
          value={overlayUrl}
          className="flex-1 bg-zinc-950 border border-green-500/40 rounded-lg px-3 py-2.5 text-xs text-green-300 font-mono truncate"
          onClick={(e) => e.target.select()}
        />
        <button
          onClick={handleCopy}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-black transition-all active:scale-95 ${
            copied
              ? "bg-green-500 text-black"
              : "bg-green-500/20 hover:bg-green-500/40 border border-green-500/50 text-green-300"
          }`}
        >
          {copied ? (
            <><CheckCircle2 className="w-3.5 h-3.5" />コピー済</>
          ) : (
            <><Copy className="w-3.5 h-3.5" />コピー</>
          )}
        </button>
      </div>

      {/* 手順 */}
      <div className="bg-black/30 rounded-xl p-3">
        <p className="text-[10px] text-green-300/70 font-bold mb-1.5">PRISM設定手順：</p>
        <ol className="space-y-1 text-[10px] text-green-200/80 list-decimal list-inside">
          <li>上のURLをコピー</li>
          <li>PRISM → 設定 → <span className="font-bold text-green-300">Web Overlay</span></li>
          <li>URLを貼り付け → 完了 ✅</li>
        </ol>
      </div>
    </div>
  );
}