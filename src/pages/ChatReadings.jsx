/**
 * ChatReadings
 * 相談者・占い師のチャット鑑定管理ページ
 * /chat-readings
 */
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageCircle, Clock, CheckCircle2, Send, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const STATUS_INFO = {
  pending_payment: { label: "決済待ち", color: "text-muted-foreground", bg: "bg-secondary" },
  paid:            { label: "受付完了", color: "text-blue-400",     bg: "bg-blue-500/15 border-blue-500/30" },
  in_progress:     { label: "鑑定中",   color: "text-yellow-400",   bg: "bg-yellow-500/15 border-yellow-500/30" },
  answered:        { label: "回答済み", color: "text-purple-400",   bg: "bg-purple-500/15 border-purple-500/30" },
  completed:       { label: "完了",     color: "text-green-400",    bg: "bg-green-500/15 border-green-500/30" },
  cancelled:       { label: "キャンセル", color: "text-muted-foreground", bg: "bg-secondary" },
  refunded:        { label: "返金済み", color: "text-orange-400",   bg: "bg-orange-500/15 border-orange-500/30" },
};

const CREATOR_STATUS_LABEL = {
  paid:        "未対応",
  in_progress: "対応中",
  answered:    "回答済み",
  completed:   "完了",
};

function StatusBadge({ status }) {
  const info = STATUS_INFO[status] || STATUS_INFO.in_progress;
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${info.bg} ${info.color}`}>
      {info.label}
    </span>
  );
}

// ── 注文詳細モーダル ──────────────────────────────────────────
function OrderDetailModal({ order, user, channel, onClose, onRefresh }) {
  const isCreator = user?.email === order.creator_email;
  const isBuyer   = user?.email === order.buyer_email;
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const qc = useQueryClient();

  useEffect(() => {
    base44.entities.ChatReadingMessage.filter({ order_id: order.id }, "created_date")
      .then(setMessages).catch(() => {});
  }, [order.id]);

  const handleSendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    const role = isCreator ? "creator" : "buyer";
    await base44.entities.ChatReadingMessage.create({
      order_id: order.id,
      sender_email: user.email,
      sender_role: role,
      message: reply.trim(),
    });
    // 占い師が初回返信 → answered に更新
    if (isCreator && order.status === "in_progress") {
      await base44.entities.ChatReadingOrder.update(order.id, {
        status: "answered",
        creator_reply: reply.trim(),
        answered_at: new Date().toISOString(),
      });
      // 相談者へ通知
      try {
        await base44.entities.Notification.create({
          user_email: order.buyer_email,
          type: "chat_reading_answered",
          title: "占い師から鑑定結果が届きました",
          message: `「${order.menu_title}」の鑑定回答が届きました。マイページでご確認ください。`,
          link: "/chat-readings",
          is_read: false,
        });
      } catch (_) {}
    }
    setReply("");
    setSending(false);
    const updated = await base44.entities.ChatReadingMessage.filter({ order_id: order.id }, "created_date");
    setMessages(updated);
    onRefresh();
    toast.success("送信しました");
  };

  const handleComplete = async () => {
    await base44.entities.ChatReadingOrder.update(order.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    onRefresh();
    onClose();
    toast.success("鑑定を完了しました");
  };

  const canChat = ["paid", "in_progress", "answered"].includes(order.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-6">
      <div className="bg-card border border-purple-500/30 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
          <div>
            <p className="font-black text-sm">{order.menu_title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={order.status} />
              <span className="text-xs text-muted-foreground">¥{order.price_yen?.toLocaleString()}</span>
              {order.paid_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(order.paid_at), "MM/dd HH:mm", { locale: ja })}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        {/* 相談内容 */}
        <div className="p-4 bg-secondary/30 shrink-0 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <MessageCircle className="w-3.5 h-3.5" />
            相談内容（{order.buyer_name}さん）
            {order.consultation_genre && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">{order.consultation_genre}</span>}
          </div>
          <p className="text-sm whitespace-pre-wrap">{order.consultation_text}</p>
          {order.birth_info && <p className="text-xs text-muted-foreground">生年月日等：{order.birth_info}</p>}
          {order.partner_info && <p className="text-xs text-muted-foreground">相手情報：{order.partner_info}</p>}
          {order.additional_info && <p className="text-xs text-muted-foreground">補足：{order.additional_info}</p>}
        </div>

        {/* メッセージ一覧 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {order.creator_reply && !messages.some(m => m.sender_role === "creator") && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 text-xs font-bold text-purple-300">占</div>
              <div className="max-w-[80%] bg-card border border-purple-500/20 rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
                {order.creator_reply}
              </div>
            </div>
          )}
          {messages.map(msg => {
            const isFromCreator = msg.sender_role === "creator";
            return (
              <div key={msg.id} className={`flex gap-2 ${isFromCreator ? "flex-row" : "flex-row-reverse"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${isFromCreator ? "bg-purple-500/20 border border-purple-500/40 text-purple-300" : "bg-primary/20 border border-primary/40 text-primary"}`}>
                  {isFromCreator ? "占" : "相"}
                </div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${isFromCreator ? "bg-card border border-purple-500/20 rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm"}`}>
                  {msg.message}
                </div>
              </div>
            );
          })}
          {messages.length === 0 && !order.creator_reply && isCreator && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>相談内容を確認して、回答を送ってください</p>
            </div>
          )}
        </div>

        {/* 入力エリア */}
        {canChat && (
          <div className="p-4 border-t border-border/50 space-y-2 shrink-0">
            <textarea
              value={reply}
              onChange={e => setReply(e.target.value.slice(0, 3000))}
              placeholder={isCreator ? "鑑定結果・アドバイスを入力..." : "追加メッセージを入力..."}
              rows={3}
              className="w-full resize-none bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSendReply}
                disabled={!reply.trim() || sending}
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 gap-2"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                送信
              </Button>
              {isCreator && (order.status === "answered" || order.status === "in_progress") && (
                <Button onClick={handleComplete} size="sm" variant="outline" className="gap-2 text-green-400 border-green-500/40 hover:bg-green-500/10">
                  <CheckCircle2 className="w-4 h-4" /> 鑑定完了にする
                </Button>
              )}
            </div>
          </div>
        )}
        {order.status === "completed" && (
          <div className="p-4 border-t border-border/50 text-center">
            <p className="text-xs text-green-400 font-bold flex items-center justify-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> 鑑定完了
              {order.completed_at && ` — ${format(new Date(order.completed_at), "yyyy/MM/dd", { locale: ja })}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── メインページ ─────────────────────────────────────────────
export default function ChatReadings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [tab, setTab] = useState("buyer");
  const [creatorFilter, setCreatorFilter] = useState("active");

  useEffect(() => {
    base44.auth.isAuthenticated().then(async ok => {
      if (!ok) { base44.auth.redirectToLogin(); return; }
      const me = await base44.auth.me();
      setUser(me);
      const channels = await base44.entities.Channel.filter({ owner_email: me.email });
      if (channels[0]) setChannel(channels[0]);
    });
  }, []);

  // 相談者として依頼した一覧
  const { data: buyerOrders = [], isLoading: buyerLoading, refetch: refetchBuyer } = useQuery({
    queryKey: ["chat-reading-orders-buyer", user?.email],
    queryFn: () => base44.entities.ChatReadingOrder.filter({ buyer_email: user.email }, "-created_date", 50),
    enabled: !!user?.email,
  });

  // 占い師として受けた依頼一覧
  const { data: creatorOrders = [], isLoading: creatorLoading, refetch: refetchCreator } = useQuery({
    queryKey: ["chat-reading-orders-creator", user?.email],
    queryFn: () => base44.entities.ChatReadingOrder.filter({ creator_email: user.email }, "-created_date", 100),
    enabled: !!user?.email && !!channel,
  });

  const isFortuneTeller = channel && (channel.service_category === "fortune_telling" || channel.stream_category === "fortune");

  const filteredCreatorOrders = creatorFilter === "all"
    ? creatorOrders
    : creatorOrders.filter(o => {
        if (creatorFilter === "active") return ["paid", "in_progress"].includes(o.status);
        if (creatorFilter === "answered") return o.status === "answered";
        if (creatorFilter === "completed") return o.status === "completed";
        return true;
      });

  const unpaidCount = creatorOrders.filter(o => o.status === "paid" || o.status === "in_progress").length;
  const totalRevenue = creatorOrders.filter(o => ["answered", "completed"].includes(o.status)).reduce((s, o) => s + (o.creator_revenue_yen || 0), 0);

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="font-black text-lg">チャット鑑定</h1>
          <p className="text-xs text-muted-foreground">鑑定依頼の管理</p>
        </div>
      </div>

      {/* タブ（占い師の場合のみ切り替え可能） */}
      {isFortuneTeller && (
        <div className="flex gap-2">
          {[
            { key: "buyer",   label: "依頼した鑑定" },
            { key: "creator", label: `受けた依頼${unpaidCount > 0 ? ` (${unpaidCount})` : ""}` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                tab === t.key ? "bg-purple-500 border-purple-500 text-white" : "border-border text-muted-foreground hover:border-purple-400/50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── 相談者ビュー ── */}
      {tab === "buyer" && (
        <div className="space-y-3">
          {buyerLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : buyerOrders.filter(o => o.status !== "pending_payment").length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <p className="text-3xl">🔮</p>
              <p className="text-muted-foreground text-sm">チャット鑑定の依頼履歴がありません</p>
              <Button size="sm" variant="outline" onClick={() => navigate("/")}>占い師を探す</Button>
            </div>
          ) : (
            buyerOrders.filter(o => o.status !== "pending_payment").map(order => (
              <div
                key={order.id}
                className="bg-card border border-border rounded-2xl p-4 hover:border-purple-500/40 transition-all cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm truncate">{order.menu_title}</p>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{order.channel_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>¥{order.price_yen?.toLocaleString()}</span>
                      <span>{format(new Date(order.created_date), "yyyy/MM/dd", { locale: ja })}</span>
                      {order.consultation_genre && <span className="px-1.5 py-0.5 bg-secondary rounded">{order.consultation_genre}</span>}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
                {order.status === "answered" && (
                  <div className="mt-2 text-xs text-purple-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> 鑑定結果が届いています！タップして確認
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── 占い師ビュー ── */}
      {tab === "creator" && isFortuneTeller && (
        <div className="space-y-4">
          {/* サマリー */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "未対応", value: creatorOrders.filter(o => o.status === "paid").length, color: "text-yellow-400" },
              { label: "対応中", value: creatorOrders.filter(o => o.status === "in_progress").length, color: "text-blue-400" },
              { label: "完了", value: creatorOrders.filter(o => o.status === "completed").length, color: "text-green-400" },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          {totalRevenue > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-bold">回答済み収益合計（還元後）</span>
              <span className="text-lg font-black text-amber-400">¥{totalRevenue.toLocaleString()}</span>
            </div>
          )}

          {/* フィルター */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "active",    label: "未対応・対応中" },
              { key: "answered",  label: "回答済み" },
              { key: "completed", label: "完了" },
              { key: "all",       label: "すべて" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setCreatorFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  creatorFilter === f.key ? "bg-purple-500 border-purple-500 text-white" : "border-border text-muted-foreground hover:border-purple-400/50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {creatorLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filteredCreatorOrders.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">依頼がありません</div>
          ) : (
            <div className="space-y-3">
              {filteredCreatorOrders.map(order => (
                <div
                  key={order.id}
                  className="bg-card border border-border rounded-2xl p-4 hover:border-purple-500/40 transition-all cursor-pointer"
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 font-black text-sm">
                      {(order.buyer_name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">{order.buyer_name || order.buyer_email}</p>
                        <StatusBadge status={order.status} />
                        {(order.status === "paid" || order.status === "in_progress") && (
                          <span className="text-[10px] font-black text-yellow-400 animate-pulse">要対応</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{order.menu_title}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>¥{order.price_yen?.toLocaleString()}</span>
                        {order.consultation_genre && <span>{order.consultation_genre}</span>}
                        <span>{format(new Date(order.created_date), "MM/dd HH:mm", { locale: ja })}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2 pl-13">
                    {order.consultation_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedOrder && user && (
        <OrderDetailModal
          order={selectedOrder}
          user={user}
          channel={channel}
          onClose={() => setSelectedOrder(null)}
          onRefresh={() => {
            refetchBuyer();
            refetchCreator();
            // 更新後の最新データをモーダルにも反映
            base44.entities.ChatReadingOrder.filter({ id: selectedOrder.id })
              .then(res => { if (res[0]) setSelectedOrder(res[0]); })
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}