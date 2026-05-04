/**
 * YellRanking — 配信内投げ銭ランキング
 * SuperChat をリアルタイム集計してユーザー別合計コインで降順表示
 */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Crown, Flame } from "lucide-react";

const RANK_STYLES = [
  { bg: "from-yellow-500/30 to-amber-600/20", border: "border-yellow-400/60", text: "text-yellow-300", crown: "👑", crownColor: "text-yellow-400" },
  { bg: "from-slate-400/25 to-slate-500/15", border: "border-slate-400/50", text: "text-slate-300", crown: "🥈", crownColor: "text-slate-400" },
  { bg: "from-orange-700/25 to-amber-800/15", border: "border-orange-600/50", text: "text-orange-300", crown: "🥉", crownColor: "text-orange-400" },
];

function buildRanking(superChats) {
  const map = {};
  for (const sc of superChats) {
    const key = sc.user_email || sc.user_name;
    if (!map[key]) map[key] = { name: sc.user_name, email: sc.user_email, total: 0 };
    map[key].total += sc.amount || 0;
  }
  return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
}

export default function YellRanking({ streamId }) {
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    if (!streamId) return;

    // 初回ロード
    base44.entities.SuperChat.filter({ livestream_id: streamId }, "-created_date", 200)
      .then((data) => setRanking(buildRanking(data)))
      .catch(() => {});

    // リアルタイム購読 — 新エール到着時にランキング再計算
    const unsub = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create" || event.data?.livestream_id !== streamId) return;
      setRanking((prev) => {
        // 既存エントリを更新 or 追加
        const key = event.data.user_email || event.data.user_name;
        const updated = [...prev];
        const idx = updated.findIndex((r) => (r.email || r.name) === key);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], total: updated[idx].total + (event.data.amount || 0) };
        } else {
          updated.push({ name: event.data.user_name, email: event.data.user_email, total: event.data.amount || 0 });
        }
        return updated.sort((a, b) => b.total - a.total).slice(0, 10);
      });
    });

    return unsub;
  }, [streamId]);

  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <Flame className="w-8 h-8 text-zinc-600" />
        <p className="text-xs text-zinc-500 text-center">まだ投げ銭がありません<br/>最初の応援を待っています！</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {ranking.map((entry, i) => {
          const style = RANK_STYLES[i] || { bg: "from-zinc-800/40 to-zinc-900/30", border: "border-zinc-700/40", text: "text-zinc-300", crown: null };
          const isTop3 = i < 3;
          return (
            <motion.div
              key={entry.email || entry.name}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-gradient-to-r ${style.bg} ${style.border} ${isTop3 ? "shadow-lg" : ""}`}
            >
              {/* 順位 */}
              <div className="w-7 flex items-center justify-center shrink-0">
                {isTop3
                  ? <span className="text-xl leading-none">{style.crown}</span>
                  : <span className="text-xs font-black text-zinc-500">{i + 1}</span>
                }
              </div>

              {/* ユーザー名 */}
              <p className={`flex-1 text-sm font-bold truncate ${style.text}`}>
                {entry.name || "匿名"}
              </p>

              {/* コイン合計 */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-base">🪙</span>
                <span className={`text-sm font-black ${isTop3 ? style.text : "text-zinc-300"}`}>
                  {entry.total.toLocaleString()}
                </span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}