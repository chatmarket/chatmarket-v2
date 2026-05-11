/**
 * === ScheduledStreamWaiting ===
 * 配信開始前の待機画面
 * カウントダウン + ビューアー数 + 期待感演出
 */

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Eye, Zap, Heart } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { ja } from "date-fns/locale";

export default function ScheduledStreamWaiting({ stream, viewerCount = 0 }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // カウントダウン更新
  useEffect(() => {
    if (!stream?.scheduled_at) return;

    const updateCountdown = () => {
      const now = new Date();
      const startTime = new Date(stream.scheduled_at);
      const diff = startTime - now;

      if (diff <= 0) {
        setTimeLeft(null); // 配信開始時刻に達した
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }
      setIsLoading(false);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [stream?.scheduled_at]);

  // 配信開始時刻に達したらnullを返す（親がLiveStreamに切り替え）
  if (!timeLeft || isLoading) return null;

  const { hours, minutes, seconds } = timeLeft;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-black to-zinc-950 overflow-hidden">
      {/* 背景アニメーション */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border-2 border-primary/30"
            style={{
              width: 200 + i * 150,
              height: 200 + i * 150,
              left: "50%",
              top: "50%",
              x: "-50%",
              y: "-50%",
            }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 20 + i * 10,
              repeat: Infinity,
              ease: "linear",
              direction: i % 2 === 0 ? "normal" : "reverse",
            }}
          />
        ))}
      </div>

      {/* コンテンツ */}
      <div className="relative z-10 text-center space-y-8 px-6">
        {/* サムネイル表示 */}
        {stream?.thumbnail_url && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative mx-auto w-48 h-48 rounded-3xl overflow-hidden border-2 border-primary/40 shadow-2xl shadow-primary/20"
          >
            <img
              src={stream.thumbnail_url}
              alt={stream.title}
              className="w-full h-full object-cover"
            />
            {/* グラデーションオーバーレイ */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {/* ライブバッジ */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute top-4 right-4 flex items-center gap-1.5 bg-red-500/90 text-white text-xs font-black px-3 py-1.5 rounded-full"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              間もなく開始
            </motion.div>
          </motion.div>
        )}

        {/* タイトル */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight">
            {stream?.title || "ライブ配信"}
          </h1>
          {stream?.description && (
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
              {stream.description}
            </p>
          )}
        </motion.div>

        {/* カウントダウン */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/40 rounded-3xl p-8 backdrop-blur-md"
        >
          <div className="flex items-center justify-center gap-1 mb-4">
            <Clock className="w-5 h-5 text-primary animate-pulse" />
            <p className="text-sm font-bold text-primary uppercase tracking-widest">
              配信開始まで
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* 時間 */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatType: "mirror",
              }}
              className="text-center"
            >
              <div className="text-5xl md:text-6xl font-black text-primary drop-shadow-lg">
                {String(hours).padStart(2, "0")}
              </div>
              <p className="text-xs text-zinc-400 mt-2 uppercase tracking-wider font-bold">
                時間
              </p>
            </motion.div>

            {/* 区切り */}
            <div className="flex items-center justify-center">
              <div className="flex flex-col gap-1">
                <span className="text-2xl font-black text-primary">:</span>
                <span className="text-2xl font-black text-primary">:</span>
              </div>
            </div>

            {/* 分 */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatType: "mirror",
                delay: 0.2,
              }}
              className="text-center"
            >
              <div className="text-5xl md:text-6xl font-black text-primary drop-shadow-lg">
                {String(minutes).padStart(2, "0")}
              </div>
              <p className="text-xs text-zinc-400 mt-2 uppercase tracking-wider font-bold">
                分
              </p>
            </motion.div>

            {/* 秒 */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                repeatType: "mirror",
                delay: 0.4,
              }}
              className="text-center"
            >
              <div className="text-5xl md:text-6xl font-black text-primary drop-shadow-lg">
                {String(seconds).padStart(2, "0")}
              </div>
              <p className="text-xs text-zinc-400 mt-2 uppercase tracking-wider font-bold">
                秒
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* チャンネル + 視聴者数 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-6 flex-wrap"
        >
          {/* チャンネル情報 */}
          <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800 rounded-full px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white text-sm font-black shrink-0">
              {stream?.channel_name?.[0]}
            </div>
            <div className="text-left min-w-0">
              <p className="text-xs text-zinc-400">配信者</p>
              <p className="text-sm font-bold text-white truncate">
                {stream?.channel_name}
              </p>
            </div>
          </div>

          {/* 視聴待機数 */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatType: "mirror",
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-cyan-500/5 border border-cyan-500/40 rounded-full px-4 py-2"
          >
            <Eye className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-sm font-black text-cyan-300">
              {viewerCount}人が待機中
            </span>
          </motion.div>
        </motion.div>

        {/* リマインドボタン */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center gap-2 mx-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-black px-8 py-3 rounded-xl transition-all shadow-lg shadow-primary/30 active:shadow-lg active:shadow-primary/10"
        >
          <Heart className="w-4 h-4" />
          開始時に通知を受け取る
        </motion.button>

        {/* 準備中メッセージ */}
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          className="text-xs text-zinc-500 mt-8"
        >
          ✨ 配信者が準備中です。お待ちください ✨
        </motion.p>
      </div>

      {/* 下部フローティングバー */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent border-t border-zinc-800 px-6 py-6 text-center"
      >
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-400 mb-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span>ライブ配信チャットは開始時に有効になります</span>
        </div>
        <p className="text-xs text-zinc-600">
          配信開始予定時刻: {new Date(stream?.scheduled_at).toLocaleString("ja-JP", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </motion.div>
    </div>
  );
}