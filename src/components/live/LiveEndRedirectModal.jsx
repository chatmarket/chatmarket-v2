import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ライブ終了→1対1個別相談への自動誘導モーダル
 * ライブ配信が「ended」状態に変わると自動表示
 * 割引コード付与で1対1予約ページへ遷導
 */
export default function LiveEndRedirectModal({ streamId, channelId, isLiveEnded, onClose }) {
  const [show, setShow] = useState(false);

  // ライブが終了したら自動表示
  useEffect(() => {
    if (isLiveEnded) {
      // 1秒遅延で表示（エモーショナル効果）
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLiveEnded]);

  const handleCallRequest = () => {
    // 割引コード付き予約リンク生成
    const discountCode = `EXPERT_LIVE_${streamId}_${Date.now()}`;
    const callUrl = `/call-request/${channelId}?discount=${discountCode}&referrer=live_end`;
    
    window.location.href = callUrl;
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* バックドロップ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShow(false);
              onClose?.();
            }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* モーダルカード */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative z-10 max-w-md w-full rounded-2xl p-8 space-y-6"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(251,191,36,0.1))",
              border: "1px solid rgba(251,191,36,0.5)",
              boxShadow: "0 0 40px rgba(251,191,36,0.25)",
            }}
          >
            {/* クローズボタン */}
            <button
              onClick={() => {
                setShow(false);
                onClose?.();
              }}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* コンテンツ */}
            <div className="space-y-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto shadow-lg">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white">
                  ご視聴ありがとうございました！
                </h3>
                <p className="text-sm text-blue-100">
                  講演会をご満足いただけましたか？
                </p>
              </div>

              <p className="text-base text-white/80 leading-relaxed">
                講演の内容についてさらに深く学びたい、個別にご相談したいというご希望がありましたら、ぜひ先生との<strong className="text-amber-400">1対1個別相談</strong>をご利用ください。
              </p>

              {/* 特典バッジ */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
                style={{
                  background: "rgba(251,191,36,0.2)",
                  border: "1px solid rgba(251,191,36,0.5)",
                  color: "#fbbf24",
                }}
              >
                🎁 視聴者限定割引コード付き
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCallRequest}
                className="w-full py-3 rounded-xl font-black text-base text-black transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #fbbf24)",
                  boxShadow: "0 0 20px rgba(251,191,36,0.4)",
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  <Phone className="w-5 h-5" />
                  先生に直接相談する
                </span>
              </motion.button>

              <button
                onClick={() => {
                  setShow(false);
                  onClose?.();
                }}
                className="w-full py-2 rounded-xl font-semibold text-sm text-white/70 hover:text-white border border-white/20 transition-all"
              >
                今は結構です
              </button>
            </div>

            <p className="text-[10px] text-white/40 text-center">
              割引コードは自動生成されます<br />
              予約ページで自動適用されます
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}