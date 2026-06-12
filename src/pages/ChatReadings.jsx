/**
 * ChatReadings
 * 相談者・占い師のチャット鑑定管理ページ（2往復制対応）
 * /chat-readings
 */
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageCircle, CheckCircle2, Send, ArrowRight, Loader2, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const STATUS_INFO = {
  pending_payment:   { label: "決済待ち",   color: "text-muted-foreground",   bg: "bg-secondary border-secondary" },
  paid:              { label: "鑑定待ち",   color: "text-yellow-400",         bg: "bg-yellow-500/15 border-yellow-500/30" },
  in_progress:       { label: "鑑定待ち",   color: "text-yellow-400",         bg: "bg-yellow-500/15 border-yellow-500/30" },
  answered:          { label: "回答済み",   color: "text-purple-400",         bg: "bg-purple-500/15 border-purple-500/30" },
  follow_up_received:{ label: "追加質問受信", color: "text-orange-400",       bg: "bg-orange-500/15 border-orange-500/30" },
  completed:         { label: "完了",       color: "text-green-400",          bg: "bg-green-500/15 border-green-500/30" },
  cancelled:         { label: "キャンセル", color: "text-muted-foreground",   bg: "bg-secondary border-secondary" },
  refunded:          { label: "返金済み",   color: "text-orange-400",         bg: "bg-orange-500/15 border-orange-500/30" },
};

// 要対応ステータス判定（paid と in_progress は同一扱い）
const isUrgent = (status) => ["paid", "in_progress"].includes(status);

function StatusBadge({ status }) {
  const info = STATUS_INFO[status] || STATUS_INFO.in_progress;
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${info.bg} ${info.color}`}>
      {info.label}
    </span>
  );
}

// 2往復制のステップ表示
function TwoRoundProgress({ order, isCreator }) {
  const buyerCount   = order.buyer_message_count   || 1;
  const creatorCount = order.creator_message_count || 0;
  const steps = [
    { label: "相談送信",     done: true },
    { label: "占い師1回目回答", done: creatorCount >= 1 },
    { label: "追加質問",     done: buyerCount >= 2 },
    { label: "最終回答",     done: creatorCount >= 2 || order.status === "completed" },
  ];
  return (
    <div className="flex items-center gap-1 py-2">
      {steps.map((s, i) => (
        <React.Fragment key={i}>
          <div className={`flex flex-col items-center gap-0.5 ${i > 0 ? "flex-1" : ""}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-colors ${s.done ? "bg-purple-500 border-purple-500 text-white" : "bg-secondary border-border text-muted-foreground"}`}>
              {s.done ? "✓" : i + 1}
            </div>
            <span className="text-[9px] text-muted-foreground text-center leading-tight hidden sm:block">{s.label}</span>
          </div>
          {i < 3 && <div className={`flex-1 h-0.5 ${s.done && steps[i+1]?.done ? "bg-purple-500" : "bg-border"}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

// 注文詳細モーダル
function OrderDetailModal({ order, user, onClose, onRefresh }) {
  const isCreator = user?.email === order.creator_email;
  const isBuyer   = user?.email === order.buyer_email;
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);

  const buyerCount   = order.buyer_message_count   || 1;
  const creatorCount = order.creator_message_count || 0;

  useEffect(() => {
    base44.entities.ChatReadingMessage.filter({ order_id: order.id }, "created_date")
      .then(setMessages).catch(() => {});
  }, [order.id]);

  // 入力可能判定
  const canCreatorReply = isCreator
    && order.payment_status === "paid"
    && creatorCount < 2
    && (
      (creatorCount === 0 && ["paid", "in_progress"].includes(order.status)) ||
      (creatorCount === 1 && order.status === "follow_up_received")
    );

  const canBuyerFollowUp = isBuyer
    && order.payment_status === "paid"
    && order.status === "answered"
    && buyerCount < 2;

  const canSend = isCreator ? canCreatorReply : canBuyerFollowUp;

  const remainingCreatorReplies = Math.max(0, 2 - creatorCount);
  const remainingBuyerMessages  = Math.max(0, 2 - buyerCount);

  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      if (isCreator) {
        const res = await base44.functions.invoke("submitChatReadingReply", {
          order_id: order.id,
          message: replyText.trim(),
        });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success(res.data?.is_final_reply ? "最終回答を送信しました" : "回答を送信しました");
      } else {
        const res = await base44.functions.invoke("sendChatReadingMessage", {
          order_id: order.id,
          message: replyText.trim(),
        });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("追加質問を送信しました");
      }
      setReplyText("");
      const updated = await base44.entities.ChatReadingMessage.filter({ order_id: order.id }, "created_date");
      setMessages(updated);
      onRefresh();
    } catch (e) {
      toast.error(e.message || "送信に失敗しました");
    }
    setSending(false);
  };

  const handleComplete = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke("completeChatReadingOrder", { order_id: order.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success("鑑定を完了しました");
      onRefresh();
      onClose();
    } catch (e) {
      toast.error(e.message || "完了処理に失敗しました");
    }
    setSending(false);
  };

  const isActive = !["completed", "cancelled", "refunded", "pending_payment"].includes(order.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-6">
      <div className="bg-card border border-purple-500/30 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm truncate">{order.menu_title}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <StatusBadge status={order.status} />
              <span className="text-xs text-muted-foreground">¥{order.price_yen?.toLocaleString()}</span>
              {order.paid_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(order.paid_at), "MM/dd HH:mm", { locale: ja })}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none ml-2 shrink-0">×</button>
        </div>

        {/* 2往復制プログレス */}
        <div className="px-4 pt-3 pb-1 shrink-0">
          <TwoRoundProgress order={order} isCreator={isCreator} />
          <div className="flex items-center gap-1.5 mt-1">
            <Info className="w-3 h-3 text-muted-foreground shrink-0" />
            <p className="text-[10px] text-muted-foreground">
              チャット鑑定は2往復制です。相談者の追加質問は1回まで、占い師の返信は合計2回です。
            </p>
          </div>
        </div>

        {/* 相談内容 */}
        <div className="px-4 py-3 bg-secondary/30 shrink-0 space-y-1.5 border-y border-border/30">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <MessageCircle className="w-3.5 h-3.5" />
            初回相談（{order.buyer_name}さん）
            {order.consultation_genre && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full text-[10px]">{order.consultation_genre}</span>
            )}
          </div>
          <p className="text-sm whitespace-pre-wrap">{order.consultation_text}</p>
          {order.birth_info     && <p className="text-xs text-muted-foreground">生年月日等：{order.birth_info}</p>}
          {order.partner_info   && <p className="text-xs text-muted-foreground">相手情報：{order.partner_info}</p>}
          {order.additional_info && <p className="text-xs text-muted-foreground">補足：{order.additional_info}</p>}
        </div>

        {/* メッセージ一覧 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* 占い師1回目回答（creator_replyフィールド / messagesに記録ない古いデータも表示） */}
          {order.creator_reply && !messages.some(m => m.sender_role === "creator") && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 text-xs font-bold text-purple-300">占</div>
              <div className="max-w-[80%] bg-card border border-purple-500/20 rounded-2xl rounded-tl-sm px-4 py-3 text-sm whitespace-pre-wrap">
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
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${isFromCreator ? "bg-card border border-purple-500/20 rounded-tl-sm" : "bg-primary text-primary-foreground rounded-tr-sm"}`}>
                  {msg.message}
                </div>
              </div>
            );
          })}

          {messages.length === 0 && !order.creator_reply && isCreator && isActive && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              相談内容を確認して、鑑定結果を送ってください
            </div>
          )}
        </div>

        {/* 残り回数バッジ */}
        {isActive && (
          <div className="px-4 pt-2 shrink-0 flex gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
              占い師返信：あと{remainingCreatorReplies}回
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
              相談者追加質問：あと{remainingBuyerMessages - 1 < 0 ? 0 : remainingBuyerMessages - 1}回
            </span>
          </div>
        )}

        {/* 入力エリア */}
        {canSend && (
          <div className="p-4 border-t border-border/50 space-y-2 shrink-0">
            <p className="text-xs text-muted-foreground">
              {isCreator
                ? creatorCount === 0 ? "鑑定結果・アドバイスを入力（1回目）" : "最終回答を入力（2回目・最後）"
                : "追加質問・補足を入力（1回限り）"
              }
            </p>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value.slice(0, isCreator ? 5000 : 3000))}
              placeholder={isCreator ? "鑑定結果を入力..." : "追加質問または補足を入力..."}
              rows={3}
              className="w-full resize-none bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {replyText.length} / {isCreator ? 5000 : 3000}
              </span>
              <div className="flex gap-2">
                {isCreator && order.status === "answered" && (
                  <Button onClick={handleComplete} size="sm" variant="outline" disabled={sending}
                    className="gap-1 text-green-400 border-green-500/40 hover:bg-green-500/10 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 完了にする
                  </Button>
                )}
                <Button onClick={handleSend} disabled={!replyText.trim() || sending} size="sm"
                  className="bg-purple-600 hover:bg-purple-500 gap-1.5">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  送信
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 完了表示 / 上限到達 / 手動完了ボタン（canSend=false時） */}
        {!canSend && isActive && (
          <div className="p-4 border-t border-border/50 shrink-0 space-y-2">
            {/* answered状態かつcanSendでない（入力エリアなし）場合に占い師が手動完了できるボタン */}
            {isCreator && order.status === "answered" && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground text-center">相談者からの追加質問がなければ、鑑定を完了できます</p>
                <Button onClick={handleComplete} size="sm" variant="outline" disabled={sending}
                  className="w-full gap-1.5 text-green-400 border-green-500/40 hover:bg-green-500/10 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 鑑定を完了にする
                </Button>
              </div>
            )}
            {order.status === "answered" && isBuyer && buyerCount >= 2 && (
              <p className="text-xs text-muted-foreground text-center">追加質問の上限（1回）に達しています</p>
            )}
            {isCreator && order.status === "follow_up_received" && (
              <p className="text-xs text-amber-400 text-center font-bold">追加質問が届いています。最終回答を送信してください。</p>
            )}
            {isCreator && creatorCount >= 2 && order.status !== "follow_up_received" && (
              <p className="text-xs text-muted-foreground text-center">返信の上限（2回）に達しています</p>
            )}
            {order.status === "follow_up_received" && isBuyer && (
              <p className="text-xs text-muted-foreground text-center">占い師の最終回答をお待ちください</p>
            )}
          </div>
        )}

        {order.status === "completed" && (
          <div className="p-4 border-t border-border/50 text-center shrink-0">
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

// メインページ
export default function ChatReadings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser]           = useState(null);
  const [channel, setChannel]     = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [tab, setTab]             = useState("buyer");
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

  const { data: buyerOrders = [], isLoading: buyerLoading, refetch: refetchBuyer } = useQuery({
    queryKey: ["chat-reading-orders-buyer", user?.email],
    queryFn: () => base44.entities.ChatReadingOrder.filter({ buyer_email: user.email }, "-created_date", 50),
    enabled: !!user?.email,
  });

  const { data: creatorOrders = [], isLoading: creatorLoading, refetch: refetchCreator } = useQuery({
    queryKey: ["chat-reading-orders-creator", user?.email],
    queryFn: () => base44.entities.ChatReadingOrder.filter({ creator_email: user.email }, "-created_date", 100),
    enabled: !!user?.email && !!channel,
  });

  const isFortuneTeller = channel && (channel.service_category === "fortune_telling" || channel.stream_category === "fortune");

  // 要対応 = paid + in_progress（同一扱い）、追加質問 = follow_up_received
  const filteredCreatorOrders = creatorOrders.filter(o => {
    if (creatorFilter === "active")    return isUrgent(o.status) || o.status === "follow_up_received";
    if (creatorFilter === "answered")  return o.status === "answered";
    if (creatorFilter === "completed") return o.status === "completed";
    return true;
  });

  const urgentCount       = creatorOrders.filter(o => isUrgent(o.status) || o.status === "follow_up_received").length;
  const needsReplyCount   = creatorOrders.filter(o => isUrgent(o.status)).length;
  const followUpCount     = creatorOrders.filter(o => o.status === "follow_up_received").length;
  const completedCount    = creatorOrders.filter(o => o.status === "completed").length;

  // 収益集計: CreatorEarning が正本（別途useQueryで取得）
  const { data: earnings = [] } = useQuery({
    queryKey: ["creator-earnings-chat", user?.email],
    queryFn: () => base44.entities.CreatorEarning.filter({ creator_email: user.email, service_type: "chat_reading" }, "-created_date", 200),
    enabled: !!user?.email && !!channel,
  });

  const totalCreatorAmount = earnings.reduce((s, e) => s + (e.creator_amount_yen || 0), 0);
  const totalGrossAmount   = earnings.reduce((s, e) => s + (e.gross_amount_yen || 0), 0);

  // CreatorEarning が存在しないのに完了済みOrderがある場合 → 不整合チェック
  const completedOrders = creatorOrders.filter(o => o.status === "completed" || o.payment_status === "paid");
  const earningOrderIds = new Set(earnings.map(e => e.service_id));
  const missingEarnings = completedOrders.filter(o => !earningOrderIds.has(o.id));

  const handleRefresh = async (orderId) => {
    refetchBuyer();
    refetchCreator();
    if (orderId) {
      const res = await base44.entities.ChatReadingOrder.filter({ id: orderId }).catch(() => []);
      if (res[0]) setSelectedOrder(res[0]);
    }
  };

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
          <p className="text-xs text-muted-foreground">2往復制 — 相談者追加質問1回・占い師返信2回まで</p>
        </div>
      </div>

      {/* タブ */}
      {isFortuneTeller && (
        <div className="flex gap-2">
          {[
            { key: "buyer",   label: "依頼した鑑定" },
            { key: "creator", label: `受けた依頼${urgentCount > 0 ? ` 🔴${urgentCount}` : ""}` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                tab === t.key ? "bg-purple-500 border-purple-500 text-white" : "border-border text-muted-foreground hover:border-purple-400/50"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* 相談者ビュー */}
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
              <div key={order.id}
                className="bg-card border border-border rounded-2xl p-4 hover:border-purple-500/40 transition-all cursor-pointer"
                onClick={() => setSelectedOrder(order)}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
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
                  <p className="mt-2 text-xs text-purple-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> 鑑定結果が届いています！追加質問もできます
                  </p>
                )}
                {order.status === "follow_up_received" && (
                  <p className="mt-2 text-xs text-orange-300 text-[10px]">占い師の最終回答をお待ちください</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 占い師ビュー */}
      {tab === "creator" && isFortuneTeller && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "要対応", value: needsReplyCount, color: "text-yellow-400" },
              { label: "追加質問", value: followUpCount, color: "text-orange-400" },
              { label: "完了", value: completedCount, color: "text-green-400" },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* 収益表示: CreatorEarning を正本として表示 */}
          {totalCreatorAmount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">収益合計（還元後）</span>
                <span className="text-lg font-black text-amber-400">¥{totalCreatorAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>総売上（税込）</span>
                <span>¥{totalGrossAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* 不整合警告: 決済済みOrderにCreatorEarningが未作成 */}
          {missingEarnings.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                {missingEarnings.length}件の注文で収益レコードが見つかりません。管理者にお問い合わせください。
              </p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {[
              { key: "active",    label: `要対応${urgentCount > 0 ? ` (${urgentCount})` : ""}` },
              { key: "answered",  label: "回答済み" },
              { key: "completed", label: "完了" },
              { key: "all",       label: "すべて" },
            ].map(f => (
              <button key={f.key} onClick={() => setCreatorFilter(f.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  creatorFilter === f.key ? "bg-purple-500 border-purple-500 text-white" : "border-border text-muted-foreground hover:border-purple-400/50"
                }`}>
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
                <div key={order.id}
                  className="bg-card border border-border rounded-2xl p-4 hover:border-purple-500/40 transition-all cursor-pointer"
                  onClick={() => setSelectedOrder(order)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 font-black text-sm">
                      {(order.buyer_name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">{order.buyer_name || order.buyer_email}</p>
                        <StatusBadge status={order.status} />
                        {isUrgent(order.status) && (
                          <span className="text-[10px] font-black text-yellow-400 animate-pulse">要対応</span>
                        )}
                        {order.status === "follow_up_received" && (
                          <span className="text-[10px] font-black text-orange-400 animate-pulse">追加質問あり</span>
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
          onClose={() => setSelectedOrder(null)}
          onRefresh={() => handleRefresh(selectedOrder?.id)}
        />
      )}
    </div>
  );
}