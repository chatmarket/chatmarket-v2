import React, { useState } from "react";
import { Copy, Check, Share2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { buildReferralUrl } from "@/lib/referral";

/**
 * 占い師向け：自分のチャンネルSNSシェアパネル
 * チャンネルページのオーナー向けに表示
 */
export default function ReferralSharePanel({ channel }) {
  const [copied, setCopied] = useState(false);

  if (!channel) return null;

  const refUrl = buildReferralUrl(channel.id, channel.name);
  const xText = encodeURIComponent(`🔮 ${channel.name}のチャンネルはこちら！\nChat Marketで鑑定中💫\n${refUrl}`);
  const lineText = encodeURIComponent(`${channel.name}のチャンネル\n${refUrl}`);

  const handleCopy = () => {
    navigator.clipboard.writeText(refUrl);
    setCopied(true);
    toast.success("紹介URLをコピーしました！");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Share2 className="w-4 h-4 text-purple-400" />
        <p className="text-sm font-black text-purple-300">SNSでシェアして集客しよう</p>
        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold ml-auto">紹介追跡付き</span>
      </div>

      {/* URL表示 */}
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={refUrl}
          className="flex-1 bg-black/30 border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono truncate"
        />
        <button
          onClick={handleCopy}
          className="shrink-0 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "コピー済" : "コピー"}
        </button>
      </div>

      {/* SNSシェアボタン */}
      <div className="flex gap-2">
        <a
          href={`https://twitter.com/intent/tweet?text=${xText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-black hover:bg-zinc-900 text-white text-xs font-bold py-2.5 rounded-xl border border-zinc-700 transition-all"
        >
          <span className="text-base">𝕏</span> X でシェア
        </a>
        <a
          href={`https://line.me/R/msg/text/?${lineText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold py-2.5 rounded-xl transition-all"
        >
          <span className="text-base">💬</span> LINEでシェア
        </a>
      </div>

      <p className="text-[10px] text-purple-400/60 text-center">
        このURLから登録・購入されると「誰の紹介か」がシステムに自動記録されます
      </p>
    </div>
  );
}