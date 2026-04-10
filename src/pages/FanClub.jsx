import React, { useState } from "react";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import MembershipCard from "../components/fanclub/MembershipCard";
import ExclusiveContent from "../components/fanclub/ExclusiveContent";
import EventBooking from "../components/fanclub/EventBooking";

export default function FanClub() {
  const [isMember, setIsMember] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/20 border border-yellow-500/40 flex items-center justify-center">
            <Crown className="w-5 h-5 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-black text-yellow-400" style={{ textShadow: "0 0 30px rgba(255,215,0,0.3)" }}>
            Fan Club
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          プレミアム会員だけが楽しめる特別なコンテンツ・体験を提供します
        </p>
        {/* デモ切り替えボタン */}
        <div className="inline-flex items-center gap-2 bg-secondary rounded-lg px-4 py-2 text-xs text-muted-foreground mt-2">
          <span>デモ状態:</span>
          <button
            onClick={() => setIsMember((v) => !v)}
            className={`px-3 py-1 rounded-md font-semibold transition-colors ${
              isMember ? "bg-yellow-500 text-black" : "bg-card text-muted-foreground border border-border"
            }`}
          >
            {isMember ? "✓ 会員加入済み" : "未加入（クリックで切替）"}
          </button>
        </div>
      </motion.div>

      {/* 会員証 / 加入カード */}
      <MembershipCard isMember={isMember} onJoin={() => setIsMember(true)} />

      {/* 限定コンテンツ */}
      <ExclusiveContent isMember={isMember} />

      {/* イベント予約 */}
      <EventBooking isMember={isMember} />
    </div>
  );
}