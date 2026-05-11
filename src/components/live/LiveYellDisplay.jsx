/**
 * === LiveYellDisplay ===
 * YellCoinSystem 統合版
 * 6段階階級制度による自動演出切り替え + ピン留め機能
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { getYellTierFromCoins } from "@/lib/constants";
import { getEffectConfig, normalizeYellData } from "@/lib/YellCoinEffectEngine";
import YellCoinEffectDisplay from "@/components/yell/YellCoinEffectDisplay";
import FeaturedYellPanel from "@/components/yell/FeaturedYellPanel";

export default function LiveYellDisplay({ streamId, latestYell }) {
  const [superChats, setSuperChats] = useState([]);
  const [displayedEffect, setDisplayedEffect] = useState(null);
  const [featuredYell, setFeaturedYell] = useState(null);

  // latestYell を受け取った時の処理
  useEffect(() => {
    if (!latestYell) return;

    try {
      const normalized = normalizeYellData(latestYell);
      console.log(`[LiveYellDisplay] 🎯 YellCoin Normalized:`, normalized);

      // 演出表示トリガー
      setDisplayedEffect(normalized);

      // ピン留め対象ならセット
      if (normalized.isFeatured) {
        setFeaturedYell(normalized);
      }
    } catch (err) {
      console.error("[LiveYellDisplay] Failed to normalize yell:", err);
    }
  }, [latestYell]);

  // エールコイン リアルタイム購読
  useEffect(() => {
    if (!streamId) return;

    console.log(`[LiveYellDisplay] 📡 Subscribing to YellCoin on stream: ${streamId}`);

    // 初回ロード
    const fetchSuperChats = async () => {
      try {
        const data = await base44.entities.SuperChat.filter(
          { livestream_id: streamId },
          "-created_date",
          20
        );
        console.log(`[LiveYellDisplay] 📥 Initial YellCoins loaded: ${data.length} items`);
        setSuperChats(data);
      } catch (err) {
        console.error("[LiveYellDisplay] Failed to fetch yells:", err);
      }
    };

    fetchSuperChats();

    // リアルタイム購読
    const unsubscribe = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create") return;
      if (event.data?.livestream_id !== streamId) return;

      console.log(
        `[LiveYellDisplay] ✅ YellCoin: ${event.data?.user_name} - ${event.data?.amount} coins`
      );

      setSuperChats((prev) => [event.data, ...prev.slice(0, 19)]);
    });

    return unsubscribe;
  }, [streamId]);

  return (
    <>
      {/* 演出表示（effectLevel 自動切り替え） */}
      <AnimatePresence>
        {displayedEffect && (
          <YellCoinEffectDisplay
            yell={displayedEffect}
            onComplete={() => setDisplayedEffect(null)}
          />
        )}
      </AnimatePresence>

      {/* ピン留めパネル（5000コイン以上） */}
      <AnimatePresence>
        {featuredYell && (
          <FeaturedYellPanel yell={featuredYell} onClose={() => setFeaturedYell(null)} />
        )}
      </AnimatePresence>

      {/* 最近のエール一覧 */}
      <div className="space-y-2">
        {superChats.length > 0 ? (
          superChats.map((sc) => {
            const tier = getYellTierFromCoins(sc.amount);
            const bgColor = getTierBgColor(tier.color);

            return (
              <motion.div
                key={sc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="rounded-lg p-3 border border-opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${bgColor}15 0%, ${bgColor}05 100%)`,
                  borderColor: `${bgColor}50`,
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{tier.emoji}</span>
                  <p className="text-sm font-black text-white">{sc.user_name}</p>
                  <span className="text-xs font-bold" style={{ color: bgColor }}>
                    {tier.name}
                  </span>
                </div>
                <p className="text-lg font-black" style={{ color: bgColor }}>
                  {sc.amount.toLocaleString()} コイン
                </p>
                {sc.message && (
                  <p className="text-xs text-gray-300 mt-1 italic">「{sc.message}」</p>
                )}
              </motion.div>
            );
          })
        ) : (
          <p className="text-xs text-zinc-500 text-center py-4">応援が表示されます</p>
        )}
      </div>
    </>
  );
}

/**
 * 階級別色を取得
 */
function getTierBgColor(color) {
  const colorMap = {
    yellow: "#fbbf24",
    orange: "#fb923c",
    red: "#ef4444",
    purple: "#a855f7",
    gold: "#fcd34d",
    diamond: "#00d4ff",
  };
  return colorMap[color] || "#fbbf24";
}