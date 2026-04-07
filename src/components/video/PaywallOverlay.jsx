import React from 'react';
import { Button } from '@/components/ui/button';
import { Lock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaywallOverlay({ price, videoTitle, loading, onPurchaseClick }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl"
    >
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-yellow-400" />
        </div>
        
        <div>
          <h3 className="text-xl font-bold text-white mb-2">ここから先は有料コンテンツです</h3>
          <p className="text-sm text-white/70">「{videoTitle}」の全編を視聴するには購入が必要です。</p>
        </div>

        <div className="bg-white/10 rounded-lg px-4 py-3 border border-white/20">
          <p className="text-2xl font-bold text-white">¥{price?.toLocaleString()}</p>
          <p className="text-xs text-white/60 mt-1">一度購入すると、何度でも視聴できます。</p>
        </div>

        <Button
          onClick={onPurchaseClick}
          disabled={loading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 h-11 gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              処理中...
            </>
          ) : (
            <>
              🔓 ¥{price?.toLocaleString()} で購入
            </>
          )}
        </Button>

        <p className="text-[10px] text-white/40">Stripe決済で安全に購入できます。</p>
      </div>
    </motion.div>
  );
}