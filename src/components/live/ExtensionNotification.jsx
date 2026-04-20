import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

export default function ExtensionNotification({ userName, isVisible, duration = 5000 }) {
  const [show, setShow] = useState(isVisible);

  useEffect(() => {
    if (!isVisible) return;
    setShow(true);
    const timer = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(timer);
  }, [isVisible, duration]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
    >
      <div className="relative">
        {/* 背景フラッシュ */}
        <motion.div
          initial={{ opacity: 0.8, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.2 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 rounded-full bg-primary/50 blur-3xl"
        />

        {/* メインテロップ */}
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
          className="relative bg-gradient-to-r from-primary to-primary/80 text-white px-8 py-4 rounded-2xl shadow-2xl border border-primary/50 flex items-center gap-3"
          style={{ boxShadow: "0 0 40px rgba(0, 255, 157, 0.6)" }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Zap className="w-6 h-6" />
          </motion.div>
          <div className="text-center">
            <p className="font-black text-lg tracking-wide">✨ 配信を延長してくれました！</p>
            <p className="text-xs text-primary-foreground/80 mt-1">{userName || "ファン"}さんが50コイン消費</p>
          </div>
        </motion.div>

        {/* パーティクル効果 */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: 0, 
              y: 0, 
              opacity: 1,
              scale: 1
            }}
            animate={{ 
              x: Math.cos((i / 8) * Math.PI * 2) * 100, 
              y: Math.sin((i / 8) * Math.PI * 2) * 100,
              opacity: 0,
              scale: 0
            }}
            transition={{ duration: 1.5 }}
            className="absolute w-2 h-2 bg-primary rounded-full"
            style={{
              top: "50%",
              left: "50%",
              margin: "-4px 0 0 -4px"
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}