import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Coins, MessageCircle, CheckCircle2, Clock, TrendingUp, Users, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const STATUS_LABEL = {
  trial: { label: "お試し中", color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30" },
  active: { label: "対応中", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/30" },
  closed: { label: "鑑定完了", color: "text-green-400", bg: "bg-green-400/10 border-green-400/30" },
};

function StatCard({ icon: Icon, label, value, color = "text-primary" }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-secondary`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
      </div>
    </div>
  );
}

export default function FortuneChatDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (ok) => {
      if (!ok) { base44.auth.redirectToLogin(); return; }
      const me = await base44.auth.me();
      setUser(me);
      const channels = await base44.entities.Channel.filter({ owner_email: me.email });
      setChannel(channels[0] || null);
    });
  }, []);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["fortune-chat-threads-dashboard", channel?.id],
    queryFn: () => base44.entities.FortuneChatThread.filter(
      { channel_id: channel.id },
      "-created_date",
      200
    ),
    enabled: !!channel?.id,
    refetchInterval: 10000,
  });

  const filtered = statusFilter === "all" ? threads : threads.filter(t => t.status === statusFilter);

  // 集計
  const totalClosed = threads.filter(t => t.status === "closed").length;
  const totalActive = threads.filter(t => t.status === "active").length;
  const totalTrial = threads.filter(t => t.status === "trial").length;
  const totalRevenue = threads
    .filter(t => t.ticket_purchased)
    .reduce((sum, t) => sum + Math.floor((t.ticket_price_coins || 500) * 0.85), 0);

  if (!user || !channel) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isFortuneTeller = channel.service_category === "fortune_telling" || channel.stream_category === "fortune";
  if (!isFortuneTeller) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-4xl">🔮</p>
        <p className="font-bold text-lg">チャット鑑定ダッシュボードは占い師専用です</p>
        <Button variant="outline" onClick={() => navigate(-1)}>戻る</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="font-black text-lg">チャット鑑定ダッシュボード</h1>
          <p className="text-xs text-muted-foreground">{channel.name}</p>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="総相談数" value={threads.length} />
        <StatCard icon={Clock} label="対応中" value={totalActive} color="text-blue-400" />
        <StatCard icon={CheckCircle2} label="鑑定完了" value={totalClosed} color="text-green-400" />
        <StatCard icon={Coins} label="累計収益(コイン)" value={totalRevenue.toLocaleString()} color="text-yellow-400" />
      </div>

      {/* お試し中の注意 */}
      {totalTrial > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-400/10 border border-yellow-400/40 rounded-2xl px-4 py-3 flex items-center gap-3"
        >
          <Clock className="w-5 h-5 text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-300 font-bold">
            お試し返信待ち: <span className="text-white">{totalTrial}件</span> — 早めにお試し返信を送って購入を促しましょう
          </p>
        </motion.div>
      )}

      {/* フィルター */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: "すべて" },
          { key: "trial", label: "お試し中" },
          { key: "active", label: "対応中" },
          { key: "closed", label: "完了" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
              statusFilter === key
                ? "bg-purple-500 border-purple-500 text-white"
                : "border-border text-muted-foreground hover:border-purple-500/50"
            }`}
          >
            {label}
            {key !== "all" && (
              <span className="ml-1.5 opacity-70">
                ({key === "trial" ? totalTrial : key === "active" ? totalActive : totalClosed})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* スレッド一覧 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-3xl">🔮</p>
          <p className="text-muted-foreground text-sm">該当するスレッドがありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((thread) => {
            const s = STATUS_LABEL[thread.status] || STATUS_LABEL.trial;
            const revenue = thread.ticket_purchased
              ? Math.floor((thread.ticket_price_coins || 500) * 0.85)
              : 0;
            const createdDate = new Date(thread.created_date);
            const dateStr = `${createdDate.getMonth() + 1}/${createdDate.getDate()} ${String(createdDate.getHours()).padStart(2, "0")}:${String(createdDate.getMinutes()).padStart(2, "0")}`;

            return (
              <motion.div
                key={thread.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-purple-500/40 transition-all cursor-pointer"
                onClick={() => navigate(`/fortune-chat/${thread.channel_id}`)}
              >
                {/* アバター */}
                <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 font-black text-purple-300 text-sm">
                  {(thread.user_name || "?")[0]}
                </div>

                {/* 情報 */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm truncate">{thread.user_name || thread.user_email}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.bg} ${s.color}`}>
                      {s.label}
                    </span>
                    {thread.ticket_purchased && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400">
                        チケット購入済み
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {thread.message_count || 0}/4通
                    </span>
                    <span>{dateStr}</span>
                    {revenue > 0 && (
                      <span className="flex items-center gap-1 text-yellow-400 font-bold">
                        <Coins className="w-3 h-3" />
                        +{revenue}コイン
                      </span>
                    )}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 合計収益フッター */}
      {threads.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">チャット鑑定 累計収益</span>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-amber-400">{totalRevenue.toLocaleString()} コイン</p>
            <p className="text-[10px] text-muted-foreground">チケット購入 {threads.filter(t => t.ticket_purchased).length}件 × 85%還元</p>
          </div>
        </div>
      )}
    </div>
  );
}