import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Lock, Play, Star, Gem, Clock, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VaultVideoCard from "./VaultVideoCard";
import VaultPurchaseModal from "./VaultPurchaseModal";

export default function VaultTab({ channel, currentUser }) {
  const [selectedVideo, setSelectedVideo] = useState(null);

  const { data: videos = [] } = useQuery({
    queryKey: ["vault-videos", channel?.id],
    queryFn: () =>
      base44.entities.Video.filter({ channel_id: channel.id }, "-created_date", 50),
    enabled: !!channel?.id,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["vault-purchases", currentUser?.email],
    queryFn: () =>
      base44.entities.Purchase.filter({ buyer_email: currentUser.email, item_type: "video", status: "completed" }),
    enabled: !!currentUser?.email,
  });

  const purchasedIds = new Set(purchases.map((p) => p.item_id));

  // 有料動画のみ「宝物庫」に表示
  const vaultVideos = videos.filter((v) => v.price > 0 || !v.is_free);

  const totalAssetValue = vaultVideos.reduce((sum, v) => sum + (v.price || 0), 0);

  if (vaultVideos.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-500/10 to-yellow-600/5 border border-amber-500/20 flex items-center justify-center">
          <Gem className="w-10 h-10 text-amber-500/40" />
        </div>
        <p className="text-muted-foreground">まだ宝物庫に作品がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Vault header stats */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 p-6"
        style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.08) 0%, rgba(120,53,15,0.12) 50%, rgba(0,0,0,0) 100%)" }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-amber-500/5 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Gem className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-black text-lg text-amber-300">The Vault — 宝物庫</h2>
            <p className="text-xs text-amber-500/60">{channel?.name} の秘蔵コレクション</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-black text-amber-300">{vaultVideos.length}</p>
            <p className="text-[10px] text-amber-500/60 uppercase tracking-wider">作品数</p>
          </div>
          <div className="text-center border-x border-amber-500/20">
            <p className="text-2xl font-black text-amber-300">¥{totalAssetValue.toLocaleString()}</p>
            <p className="text-[10px] text-amber-500/60 uppercase tracking-wider">総資産価値</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-amber-300">{purchases.length}</p>
            <p className="text-[10px] text-amber-500/60 uppercase tracking-wider">あなたの購入</p>
          </div>
        </div>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <AnimatePresence>
          {vaultVideos.map((video, i) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <VaultVideoCard
                video={video}
                isPurchased={purchasedIds.has(video.id)}
                onSelect={() => setSelectedVideo(video)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {selectedVideo && (
        <VaultPurchaseModal
          video={selectedVideo}
          user={currentUser}
          isPurchased={purchasedIds.has(selectedVideo.id)}
          onClose={() => setSelectedVideo(null)}
          onPurchased={() => {
            setSelectedVideo(null);
          }}
        />
      )}
    </div>
  );
}