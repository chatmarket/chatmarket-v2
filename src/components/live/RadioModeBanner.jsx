import React from "react";
import { motion } from "framer-motion";
import { Radio, AlertCircle } from "lucide-react";

/**
 * ラジオモード中の視聴者向けバナー
 * 「故障？」という誤解を防ぐための告知
 */
export default function RadioModeBanner({ isRadioMode }) {
  if (!isRadioMode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-16 left-1/2 -translate-x-1/2 z-20"
    >
      <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl px-4 py-3 backdrop-blur-sm flex items-center gap-3 shadow-lg">
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Radio className="w-5 h-5 text-amber-400" />
        </motion.div>
        <div>
          <p className="text-sm font-bold text-amber-300">📻 ラジオモード配信中</p>
          <p className="text-xs text-amber-200/70">映像は停止し、音声に特化した配信です</p>
        </div>
      </div>
    </motion.div>
  );
}