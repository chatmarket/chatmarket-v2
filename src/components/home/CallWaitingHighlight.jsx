import React from "react";
import { Phone, MapPin } from "lucide-react";
import CallWaitingRow from "./CallWaitingRow";

/**
 * Home の最上部に固定表示される「今すぐ通話可能」セクション
 * 目立つデザインで、ユーザーに導線を最短化
 */
export default function CallWaitingHighlight({ user, categoryFilter, filteredChannels }) {
  return (
    <div className="sticky top-16 z-20 bg-gradient-to-b from-background via-background to-transparent pb-4">
      <section className="px-0 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <div className="flex items-center gap-2 flex-1">
            <Phone className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-black text-white">今すぐ通話可能なクリエイター</h2>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold shrink-0">待機中</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">💬 クリエイターをタップして、インメッセージで声をかけて通話開始！</div>
        <CallWaitingRow user={user} categoryFilter={categoryFilter} filteredChannels={filteredChannels} />
      </section>
    </div>
  );
}