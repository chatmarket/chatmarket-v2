import React from "react";
import { Heart, Sparkles } from "lucide-react";

// エールコインの金額からメッセージの感情強度を推定して表示
const IMPACT_MESSAGES = [
  "あなたの配信のおかげで、今日も頑張れました。",
  "救われました。ありがとうございます。",
  "あなたの言葉が、私の背中を押してくれました。",
  "毎回楽しみにしています。本当にありがとう。",
  "あなたがいるから、明日も頑張れます。",
  "この配信に出会えて良かったです。",
];

function getImpactStatement(totalAmount, callCount, superChatCount) {
  const totalPeople = superChatCount + callCount;
  if (totalPeople === 0) return null;
  return {
    people: totalPeople,
    hours: callCount,
    messages: superChatCount,
  };
}

export default function ThanksLetterCard({ superChats = [], videoCalls = [] }) {
  // メッセージ付きスーパーチャットを抽出（感謝の声）
  const thanksMessages = superChats
    .filter(s => s.message && s.message.trim().length > 5)
    .slice(0, 6);

  const totalSupporters = new Set([
    ...superChats.map(s => s.user_email),
    ...videoCalls.map(c => c.caller_email),
  ]).size;

  const callHours = videoCalls.reduce((s, c) => s + (c.actual_duration_minutes || c.duration_minutes || 15), 0);
  const callHoursDisplay = callHours >= 60
    ? `${Math.floor(callHours / 60)}時間${callHours % 60}分`
    : `${callHours}分`;

  return (
    <div className="rounded-2xl border border-pink-500/30 p-5 space-y-4"
      style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.07), rgba(168,85,247,0.05))" }}>

      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
        <p className="text-xs font-black text-pink-400 uppercase tracking-widest">あなたが救った人たち</p>
      </div>

      {/* インパクト数値 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-background/50 rounded-xl p-3 text-center space-y-1">
          <span className="text-2xl">👥</span>
          <p className="text-2xl font-black text-pink-400">{totalSupporters}</p>
          <p className="text-[10px] text-muted-foreground">あなたを支えた人</p>
        </div>
        <div className="bg-background/50 rounded-xl p-3 text-center space-y-1">
          <span className="text-2xl">⏱️</span>
          <p className="text-lg font-black text-purple-400">{callHoursDisplay}</p>
          <p className="text-[10px] text-muted-foreground">寄り添った時間</p>
        </div>
        <div className="bg-background/50 rounded-xl p-3 text-center space-y-1">
          <span className="text-2xl">💌</span>
          <p className="text-2xl font-black text-amber-400">{superChats.length}</p>
          <p className="text-[10px] text-muted-foreground">届いた感謝</p>
        </div>
      </div>

      {/* サンクスメッセージ一覧 */}
      {thanksMessages.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-pink-400" /> ファンからの声
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {thanksMessages.map((s, i) => (
              <div key={i} className="rounded-xl px-4 py-3 space-y-1"
                style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)" }}>
                <p className="text-xs text-foreground/90 leading-relaxed italic">「{s.message}」</p>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">{s.user_name || "匿名サポーター"}</p>
                  <p className="text-[10px] text-pink-400 font-bold">¥{s.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-3 space-y-1">
          <p className="text-sm text-muted-foreground">まだメッセージ付きのエールがありません</p>
          <p className="text-xs text-muted-foreground/60">配信を続けると、ファンからの感謝の声が届きます。</p>
        </div>
      )}

      {/* 励ましメッセージ */}
      <div className="rounded-xl px-4 py-3 text-center"
        style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)" }}>
        <p className="text-xs text-purple-300 font-semibold leading-relaxed">
          💜 あなたの{callHoursDisplay}は、{totalSupporters}人の心に届きました。<br />
          あなたの価値は、お金には換算できません。
        </p>
      </div>
    </div>
  );
}