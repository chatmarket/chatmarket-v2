import React, { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function ObsConfigDisplay({ streamKey, ingestEndpoint }) {
  const [expanded, setExpanded] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("コピーしました");
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!streamKey || !ingestEndpoint) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <p className="text-sm text-yellow-300">OBS設定情報を待機中...</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 w-96 max-w-[calc(100%-2rem)]">
      <div
        className="bg-black border border-primary/50 rounded-lg overflow-hidden shadow-2xl cursor-pointer hover:border-primary transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-bold text-white">OBS RTMPS 設定</span>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-primary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-primary" />
          )}
        </div>

        {/* 設定内容 */}
        {expanded && (
          <div className="px-4 py-3 space-y-4 border-t border-primary/20">
            {/* サーバーURL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary/70 uppercase tracking-wider">
                サーバーURL
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  readOnly
                  value={`rtmps://${ingestEndpoint}:443/app/`}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white/80 font-mono truncate"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(
                      `rtmps://${ingestEndpoint}:443/app/`,
                      "endpoint"
                    );
                  }}
                  className="w-9 h-9 rounded-lg bg-primary/20 hover:bg-primary/30 flex items-center justify-center text-primary transition-colors shrink-0"
                >
                  {copiedField === "endpoint" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* ストリームキー */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-primary/70 uppercase tracking-wider">
                ストリームキー
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="password"
                  readOnly
                  value={streamKey}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white/80 font-mono truncate"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(streamKey, "key");
                  }}
                  className="w-9 h-9 rounded-lg bg-primary/20 hover:bg-primary/30 flex items-center justify-center text-primary transition-colors shrink-0"
                >
                  {copiedField === "key" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* OBS設定ガイド */}
            <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-white/70">設定手順:</p>
              <ol className="text-xs text-white/60 space-y-1 ml-3">
                <li>1. OBS → Settings → Stream</li>
                <li>2. Service: "Custom RTMPS Server"</li>
                <li>3. Server: サーバーURL をペースト</li>
                <li>4. Stream Key: キーをペースト</li>
                <li>5. Start Streaming をクリック</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}