import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Lock, Radio, Archive, Play, Calendar } from "lucide-react";

const ARCHIVES = [
  { id: 1, title: "会員限定トーク #12 — 裏話大公開", date: "2026-04-05", thumb: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&h=225&fit=crop" },
  { id: 2, title: "ファン感謝祭 2026 春", date: "2026-03-28", thumb: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=225&fit=crop" },
  { id: 3, title: "深夜の音楽セッション", date: "2026-03-15", thumb: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=225&fit=crop" },
  { id: 4, title: "Q&A スペシャル", date: "2026-03-01", thumb: "https://images.unsplash.com/photo-1527015175922-36a306cf0e20?w=400&h=225&fit=crop" },
];

function LockOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(2px)" }}
    >
      <div className="w-16 h-16 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-yellow-400" />
      </div>
      <p className="text-white font-bold text-lg mb-1">会員限定コンテンツ</p>
      <p className="text-white/60 text-sm mb-4 text-center px-4">ファンクラブに参加してアクセスしよう</p>
    </motion.div>
  );
}

export default function ExclusiveContent({ isMember }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-yellow-400" />
        会員限定コンテンツ
      </h2>

      <Tabs defaultValue="live">
        <TabsList className="bg-secondary">
          <TabsTrigger value="live" className="gap-2">
            <Radio className="w-4 h-4" /> 限定ライブ配信
          </TabsTrigger>
          <TabsTrigger value="archive" className="gap-2">
            <Archive className="w-4 h-4" /> アーカイブ動画
          </TabsTrigger>
        </TabsList>

        {/* ライブ配信タブ */}
        <TabsContent value="live">
          <div className="relative">
            <div className={isMember ? "" : "pointer-events-none select-none"} style={isMember ? {} : { filter: "blur(6px)" }}>
              <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center relative">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto">
                      <Radio className="w-8 h-8 text-red-400 animate-pulse" />
                    </div>
                    <div>
                      <p className="font-bold text-white">🔴 LIVE — ファンクラブ限定配信中</p>
                      <p className="text-white/60 text-sm mt-1">視聴者数: 142人</p>
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                    LIVE
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold">会員限定トーク — 今夜の裏話</p>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> 2026/04/10 21:00〜
                  </p>
                </div>
              </div>
            </div>
            {!isMember && <LockOverlay />}
          </div>
        </TabsContent>

        {/* アーカイブタブ */}
        <TabsContent value="archive">
          <div className="relative">
            <div className={isMember ? "" : "pointer-events-none select-none"} style={isMember ? {} : { filter: "blur(6px)" }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ARCHIVES.map((a) => (
                  <div key={a.id} className="bg-card border border-border/50 rounded-xl overflow-hidden group cursor-pointer hover:border-yellow-500/30 transition-colors">
                    <div className="relative aspect-video overflow-hidden">
                      <img src={a.thumb} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-yellow-400/90 flex items-center justify-center">
                          <Play className="w-5 h-5 text-black fill-black" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold line-clamp-1">{a.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {a.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {!isMember && <LockOverlay />}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}