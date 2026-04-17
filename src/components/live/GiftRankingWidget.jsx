import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trophy, Crown, Flame, Star, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * GiftRankingWidget
 * ライブ配信中のギフト（投げ銭）ランキングをリアルタイム表示
 * ファンの競争心を刺激するデザイン
 */
export default function GiftRankingWidget({ streamId, isLive }) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState(null);

  // ギフトランキング取得 & リアルタイム更新
  useEffect(() => {
    if (!isLive || !streamId) return;

    const fetchRankings = async () => {
      try {
        // SuperChat をギフト送付者でグループ化してランキング取得
        const gifts = await base44.entities.SuperChat.filter({ livestream_id: streamId }, '-created_date', 100);
        
        // ユーザーごとにギフト額を集計
        const rankMap = {};
        for (const gift of gifts) {
          if (!rankMap[gift.user_email]) {
            rankMap[gift.user_email] = {
              email: gift.user_email,
              name: gift.user_name || gift.user_email.split('@')[0],
              totalAmount: 0,
              lastGiftAt: gift.created_date,
              giftCount: 0,
            };
          }
          rankMap[gift.user_email].totalAmount += gift.amount || 0;
          rankMap[gift.user_email].giftCount += 1;
          rankMap[gift.user_email].lastGiftAt = gift.created_date;
        }

        // ランキング化（総額でソート）
        const ranked = Object.values(rankMap)
          .sort((a, b) => b.totalAmount - a.totalAmount)
          .slice(0, 5); // TOP 5

        setRankings(ranked);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch gift rankings:', err);
        setLoading(false);
      }
    };

    // 初期取得
    fetchRankings();

    // リアルタイム更新（ポーリング）
    const interval = setInterval(fetchRankings, 5000); // 5秒ごと
    
    return () => clearInterval(interval);
  }, [streamId, isLive]);

  // 新しいランキングが来たときのハイライト効果
  useEffect(() => {
    if (rankings.length > 0) {
      setHighlightId(rankings[0]?.email);
      const timer = setTimeout(() => setHighlightId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [rankings[0]?.totalAmount]);

  if (!isLive || loading) {
    return null;
  }

  const topGifter = rankings[0];
  const otherGifters = rankings.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 right-4 z-40 w-72 space-y-3"
    >
      {/* ===== トップギフター（メイン） ===== */}
      {topGifter && (
        <motion.div
          animate={highlightId === topGifter.email ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #FFD700, #FFA500)',
            boxShadow: highlightId === topGifter.email 
              ? '0 0 30px rgba(255, 215, 0, 0.8)' 
              : '0 0 15px rgba(255, 215, 0, 0.4)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-40" />
          </div>

          <div className="relative px-5 py-4 flex items-start gap-3">
            {/* アイコン */}
            <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 text-white drop-shadow-lg animate-pulse" />
            </div>

            {/* 情報 */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white/80 uppercase tracking-widest">TOP GIFTER</p>
              <p className="font-black text-white text-lg leading-tight truncate">
                {topGifter.name}
              </p>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black text-white">¥{topGifter.totalAmount.toLocaleString()}</span>
                <span className="text-xs text-white/70">{topGifter.giftCount}回の応援</span>
              </div>
            </div>

            {/* フレーム装飾 */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-3xl pointer-events-none" />
          </div>
        </motion.div>
      )}

      {/* ===== ランキング2〜5位 ===== */}
      {otherGifters.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-black/70 backdrop-blur-md rounded-xl border border-amber-500/30 overflow-hidden"
        >
          <div className="px-4 py-3 space-y-2">
            <AnimatePresence mode="popLayout">
              {otherGifters.map((gifter, idx) => (
                <motion.div
                  key={gifter.email}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  {/* 順位バッジ */}
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-white">{idx + 2}</span>
                  </div>

                  {/* 名前 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                      {gifter.name}
                    </p>
                  </div>

                  {/* ギフト額 */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-amber-300">¥{gifter.totalAmount.toLocaleString()}</p>
                    <p className="text-[10px] text-white/50">{gifter.giftCount}回</p>
                  </div>

                  {/* ギフトアイコン */}
                  <Gift className="w-4 h-4 text-amber-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* ===== 説明文 ===== */}
      <div className="text-center text-[10px] text-white/60 px-2">
        <p>💰 リアルタイムギフトランキング</p>
        <p>5秒ごと更新</p>
      </div>

      {/* ===== アニメーション背景 ===== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, linear: true }}
          className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/20 to-transparent"
        />
      </div>
    </motion.div>
  );
}