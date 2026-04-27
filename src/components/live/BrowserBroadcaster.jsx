/**
 * BrowserBroadcaster
 * ブラウザ配信はOBS経由で行います（IVS SDK完全排除）
 */
import React from "react";
import { Radio } from "lucide-react";

export default function BrowserBroadcaster({ streamKey, ingestEndpoint, onEnd }) {
  return (
    <div className="w-full h-full bg-black flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
          <Radio className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="text-white font-bold text-xl mb-2">OBSで配信してください</p>
          <p className="text-zinc-400 text-sm">ブラウザ直接配信は現在メンテナンス中です。OBSを使って配信を開始してください。</p>
        </div>
        {streamKey && ingestEndpoint && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-left space-y-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Server URL</p>
              <p className="text-xs text-zinc-300 font-mono break-all">{ingestEndpoint}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Stream Key</p>
              <p className="text-xs text-zinc-300 font-mono break-all">{streamKey}</p>
            </div>
          </div>
        )}
        {onEnd && (
          <button
            onClick={onEnd}
            className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white text-sm font-bold transition-colors"
          >
            戻る
          </button>
        )}
      </div>
    </div>
  );
}