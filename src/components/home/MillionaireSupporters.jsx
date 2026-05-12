/**
 * MillionaireSupporters
 * 2,000万円達成ライバーのTOPサポーター10名を表示。
 * ランキング画面の「現在のミリオネア候補を支えるTOPサポーター」リスト。
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
// Icons removed - using emoji instead

const MILLIONAIRE_THRESHOLD = 20000000; // 2,000万コイン

export default function MillionaireSupporters() {
  const { data: channels = [] } = useQuery({
    queryKey: ["millionaire-channels"],
    queryFn: () => base44.entities.Channel.list("-monthly_revenue_coins", 10),
    enabled: false,
    staleTime: 600000,
    gcTime: 1200000,
  });

  // 2,000万超のチャンネル
  const millionaireChannels = channels.filter(
    (c) => (c.monthly_revenue_coins || 0) >= MILLIONAIRE_THRESHOLD
  );

  // 達成に近いチャンネル（候補：500万コイン以上）
  const candidateChannels = channels.filter(
    (c) =>
      (c.monthly_revenue_coins || 0) >= 5000000 &&
      (c.monthly_revenue_coins || 0) < MILLIONAIRE_THRESHOLD
  ).slice(0, 3);

  const { data: transactions = [] } = useQuery({
    queryKey: ["millionaire-top-supporters"],
    queryFn: () =>
      base44.entities.YellCoinTransaction.filter({ type: "send" }, "-created_date", 100),
    enabled: false,
    staleTime: 600000,
    gcTime: 1200000,
  });

  // 当月絞り込み
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthTxns = transactions.filter((t) => t.created_date >= monthStart);

  // チャンネルごとのTOPサポーター
  function getTopSupporters(channelId, limit = 10) {
    const map = {};
    monthTxns
      .filter((t) => t.channel_id === channelId || t.target_id === channelId)
      .forEach((t) => {
        const key = t.user_email;
        map[key] = (map[key] || 0) + (t.amount || 0);
      });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([email, coins], i) => ({ rank: i + 1, email, coins }));
  }

  const targetChannels = millionaireChannels.length > 0 ? millionaireChannels : candidateChannels;
  if (targetChannels.length === 0) return null;

  const isMega = millionaireChannels.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">👑</span>
        <h2 className="text-lg font-bold">
          {isMega ? "👑 ミリオネア・サポーター" : "🏆 TOPサポーター候補"}
        </h2>
        {isMega && (
          <span className="text-[10px] font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-full">
            2,000万達成
          </span>
        )}
      </div>

      {targetChannels.map((ch) => {
        const supporters = getTopSupporters(ch.id);
        if (supporters.length === 0) return null;
        return (
          <div
            key={ch.id}
            className={`rounded-2xl border p-4 space-y-3 card-float ${
              isMega
                ? "bg-gradient-to-br from-yellow-900/20 to-black border-yellow-400/40"
                : "bg-card border-border/40"
            }`}
          >
            {/* チャンネルヘッダー */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden shrink-0">
                {ch.avatar_url ? (
                  <img src={ch.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-xs font-bold text-yellow-400">
                    {ch.name?.[0]}
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-sm">{ch.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  当月 {(ch.monthly_revenue_coins || 0).toLocaleString()} コイン
                  {isMega && " 🎊 達成"}
                </p>
              </div>
            </div>

            {/* サポーターリスト */}
            <div className="space-y-1.5">
              {supporters.map(({ rank, email, coins }) => {
                const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
                const maxCoins = supporters[0].coins;
                const pct = Math.round((coins / maxCoins) * 100);
                const isGold = isMega && rank <= 10;
                return (
                  <div key={email} className="flex items-center gap-2">
                    <span className="w-6 text-center text-xs shrink-0">{medal}</span>
                    <span className={`text-xs truncate w-28 shrink-0 ${isGold ? "text-yellow-300 font-bold" : "text-foreground/80"}`}>
                      {isGold && "🏅 "}
                      {email.split("@")[0]}
                      {isGold && <span className="text-yellow-400 ml-1 text-[10px]">黄金</span>}
                    </span>
                    <div className="flex-1 bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isGold ? "bg-yellow-400" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold shrink-0 w-20 text-right ${isGold ? "text-yellow-400" : "text-primary"}`}>
                      {coins.toLocaleString()} 枚
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}