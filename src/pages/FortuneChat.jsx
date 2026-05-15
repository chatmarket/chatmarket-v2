import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Lock, Unlock, Sparkles, Coins, MessageCircle, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const PREVIEW_CHARS = 60; // お試し返信のプレビュー文字数
const MAX_INPUT = 1000;

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" });
}

// ── マスク付きメッセージバブル ──────────────────────────────
function MessageBubble({ msg, isMe, channel, hasPaidTicket }) {
  const [revealed, setRevealed] = useState(false);
  const needsMask = msg.is_masked && !hasPaidTicket && !isMe;
  const preview = msg.content.slice(0, PREVIEW_CHARS);
  const rest = msg.content.slice(PREVIEW_CHARS);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
    >
      {!isMe && (
        <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 mt-1">
          {channel?.avatar_url
            ? <img src={channel.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            : <span className="text-xs font-bold text-purple-300">{channel?.name?.[0]}</span>}
        </div>
      )}
      <div className={`max-w-[78%] space-y-1 flex flex-col ${isMe ? "items-end" : "items-start"}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed relative overflow-hidden ${
          isMe
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-card border border-purple-500/30 text-foreground rounded-tl-sm"
        }`}>
          {needsMask && !revealed ? (
            <>
              <p>{preview}…</p>
              {rest.length > 0 && (
                <div className="relative mt-1">
                  <p className="blur-sm select-none text-muted-foreground text-xs pointer-events-none" aria-hidden="true">
                    {rest.slice(0, 80)}
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-purple-400 opacity-70" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <p>{msg.content}</p>
          )}
        </div>

        {/* マスク解除誘導カード */}
        {needsMask && !revealed && rest.length > 0 && (
          <div className="w-full bg-gradient-to-br from-purple-500/15 to-purple-600/5 border border-purple-500/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <p className="text-xs font-bold text-purple-300">続きを読むには鑑定チケットが必要です</p>
            </div>
            <p className="text-[11px] text-muted-foreground">占い師からの本格鑑定の続きがあります。チケットを購入すると全文が表示され、さらに2往復（計4通）の鑑定が受けられます。</p>
            <Link to={`#buy-ticket`}>
              <Button
                size="sm"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold gap-2 rounded-xl"
                onClick={() => document.getElementById("buy-ticket-section")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Coins className="w-4 h-4" />
                チケットを購入して続きを読む
              </Button>
            </Link>
          </div>
        )}

        <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_date)}</span>
      </div>
    </motion.div>
  );
}

// ── メイン ────────────────────────────────────────────────
export default function FortuneChat() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const bottomRef = useRef(null);

  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [thread, setThread] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [buyingTicket, setBuyingTicket] = useState(false);
  const [showTrialReplyModal, setShowTrialReplyModal] = useState(false);
  const [trialReply, setTrialReply] = useState("");
  const [sendingTrialReply, setSendingTrialReply] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (ok) => {
      if (!ok) { base44.auth.redirectToLogin(); return; }
      const me = await base44.auth.me();
      setUser(me);
    });
  }, []);

  useEffect(() => {
    if (!channelId) return;
    base44.entities.Channel.filter({ id: channelId }).then((res) => setChannel(res[0]));
  }, [channelId]);

  // スレッド取得 or 作成
  useEffect(() => {
    if (!user || !channelId) return;
    base44.entities.FortuneChatThread.filter({
      channel_id: channelId,
      user_email: user.email,
    }, "-created_date", 1).then((res) => {
      if (res[0]) {
        setThread(res[0]);
      }
    });
  }, [user, channelId]);

  const { data: messages = [] } = useQuery({
    queryKey: ["fortune-chat-messages", thread?.id],
    queryFn: () => base44.entities.FortuneChatMessage.filter({ thread_id: thread.id }, "created_date"),
    enabled: !!thread?.id,
    refetchInterval: 2000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // リアルタイム購読
  useEffect(() => {
    if (!thread?.id) return;
    const unsub = base44.entities.FortuneChatMessage.subscribe((event) => {
      if (event.data?.thread_id === thread.id) {
        queryClient.invalidateQueries({ queryKey: ["fortune-chat-messages", thread.id] });
      }
    });
    return unsub;
  }, [thread?.id, queryClient]);

  const isFortuneOwner = user?.email === channel?.owner_email;
  const hasPaidTicket = thread?.ticket_purchased === true;
  const msgCount = messages.length;
  const isClosed = thread?.status === "closed" || msgCount >= 4;
  const canUserSend = !isClosed && (msgCount === 0 || (hasPaidTicket && msgCount < 4));
  const userMsgCount = messages.filter(m => m.role === "user").length;
  const ftMsgCount = messages.filter(m => m.role === "fortune_teller").length;
  const hasTrialReply = messages.some(m => m.is_trial_reply);
  const canFortuneReply = isFortuneOwner && !isClosed && ftMsgCount < msgCount;

  const createThreadIfNeeded = async () => {
    if (thread) return thread;
    const newThread = await base44.entities.FortuneChatThread.create({
      channel_id: channelId,
      channel_name: channel.name,
      channel_owner_email: channel.owner_email,
      user_email: user.email,
      user_name: user.full_name || user.email,
      status: "trial",
      message_count: 0,
      ticket_price_coins: channel.fortune_chat_price || 500,
      ticket_purchased: false,
    });
    setThread(newThread);
    return newThread;
  };

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    const t = await createThreadIfNeeded();
    const newMsg = await base44.entities.FortuneChatMessage.create({
      thread_id: t.id,
      from_email: user.email,
      from_name: user.full_name || user.email,
      role: "user",
      content: input.trim(),
      is_trial_reply: false,
      is_masked: false,
    });
    const newCount = (t.message_count || 0) + 1;
    const updatedThread = await base44.entities.FortuneChatThread.update(t.id, {
      message_count: newCount,
      status: newCount >= 4 ? "closed" : t.status,
    });
    setThread(updatedThread);
    setInput("");
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["fortune-chat-messages", t.id] });
  };

  // 占い師がお試し返信を送る
  const handleSendTrialReply = async () => {
    if (!trialReply.trim() || !thread) return;
    setSendingTrialReply(true);
    await base44.entities.FortuneChatMessage.create({
      thread_id: thread.id,
      from_email: user.email,
      from_name: channel.name,
      role: "fortune_teller",
      content: trialReply.trim(),
      is_trial_reply: true,
      is_masked: true,
      preview_chars: PREVIEW_CHARS,
    });
    const newCount = (thread.message_count || 0) + 1;
    const updated = await base44.entities.FortuneChatThread.update(thread.id, {
      message_count: newCount,
      status: newCount >= 4 ? "closed" : thread.status,
    });
    setThread(updated);
    setSendingTrialReply(false);
    setTrialReply("");
    setShowTrialReplyModal(false);
    queryClient.invalidateQueries({ queryKey: ["fortune-chat-messages", thread.id] });
    toast.success("お試し返信を送信しました（続きは購入後に表示されます）");
  };

  // 占い師が通常返信
  const handleFortuneReply = async () => {
    if (!input.trim() || !thread) return;
    setSending(true);
    await base44.entities.FortuneChatMessage.create({
      thread_id: thread.id,
      from_email: user.email,
      from_name: channel.name,
      role: "fortune_teller",
      content: input.trim(),
      is_trial_reply: false,
      is_masked: false,
    });
    const newCount = (thread.message_count || 0) + 1;
    const updated = await base44.entities.FortuneChatThread.update(thread.id, {
      message_count: newCount,
      status: newCount >= 4 ? "closed" : thread.status,
    });
    setThread(updated);
    setInput("");
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["fortune-chat-messages", thread.id] });
  };

  // チケット購入（コイン消費）
  const handleBuyTicket = async () => {
    if (!thread || buyingTicket) return;
    setBuyingTicket(true);
    // ウォレット確認
    const wallets = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
    const wallet = wallets[0];
    const price = thread.ticket_price_coins || 500;
    if (!wallet || (wallet.balance || 0) < price) {
      toast.error(`コインが不足しています。必要: ${price}コイン`);
      setBuyingTicket(false);
      return;
    }
    // コイン消費
    await base44.entities.YellCoinWallet.update(wallet.id, {
      balance: wallet.balance - price,
      total_sent: (wallet.total_sent || 0) + price,
    });
    // 占い師ウォレットに加算
    const ftWallets = await base44.entities.YellCoinWallet.filter({ user_email: channel.owner_email });
    if (ftWallets[0]) {
      await base44.entities.YellCoinWallet.update(ftWallets[0].id, {
        balance: (ftWallets[0].balance || 0) + Math.floor(price * 0.85),
      });
    }
    // スレッド更新
    const updated = await base44.entities.FortuneChatThread.update(thread.id, {
      ticket_purchased: true,
      ticket_purchased_at: new Date().toISOString(),
      status: "active",
    });
    setThread(updated);
    setBuyingTicket(false);
    toast.success("チケット購入完了！全文が表示され、2往復の鑑定が続きます🔮");
    queryClient.invalidateQueries({ queryKey: ["fortune-chat-messages", thread.id] });
  };

  if (!channel) {
    return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  // 占い師カテゴリ以外はチャット鑑定機能を無効化
  // service_category="fortune_telling" または stream_category="fortune" のどちらかが必須
  const isFortuneTeller = channel.service_category === "fortune_telling" || channel.stream_category === "fortune";
  if (!isFortuneTeller) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-4xl">🚫</p>
        <p className="font-bold text-lg">チャット鑑定は占い師カテゴリのみ</p>
        <p className="text-sm text-muted-foreground">このチャンネルはチャット鑑定機能を有効にしていません。</p>
        <Button variant="outline" onClick={() => navigate(-1)}>戻る</Button>
      </div>
    );
  }

  const ticketPrice = thread?.ticket_price_coins || channel.fortune_chat_price || 500;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-3rem)] sm:h-[calc(100vh-4rem)]">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-purple-500/20 bg-card/80 backdrop-blur shrink-0">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center overflow-hidden">
          {channel.avatar_url
            ? <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-sm font-bold text-purple-300">{channel.name?.[0]}</span>}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm">{channel.name}</p>
            <span className="text-[10px] bg-purple-500/20 border border-purple-500/40 text-purple-300 px-2 py-0.5 rounded-full font-bold">🔮 チャット鑑定</span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {isClosed ? "鑑定完了（4通）" : `${msgCount}/4通 ${hasPaidTicket ? "チケット有効" : "お試し中"}`}
          </p>
        </div>
        {/* 往復カウンター */}
        <div className="flex gap-1">
          {[1,2,3,4].map(i => (
            <div key={i} className={`w-3 h-3 rounded-full border ${i <= msgCount ? "bg-purple-500 border-purple-400" : "border-muted-foreground/30"}`} />
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 初期案内 */}
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <p className="font-black text-sm text-purple-300">チャット鑑定の流れ</p>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2"><span className="bg-purple-500/30 text-purple-300 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold text-[10px]">1</span><p>相談内容を送信（無料お試し）</p></div>
              <div className="flex items-start gap-2"><span className="bg-purple-500/30 text-purple-300 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold text-[10px]">2</span><p>占い師からお試し鑑定が届く（一部表示）</p></div>
              <div className="flex items-start gap-2"><span className="bg-amber-500/30 text-amber-300 rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold text-[10px]">3</span><p>チケット購入で全文＋追加2往復（計4通）が解放</p></div>
            </div>
            <p className="text-[10px] text-purple-300/60 text-center">チケット: {ticketPrice}コイン（占い師収益 85%）</p>
          </motion.div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isMe={msg.from_email === user?.email}
            channel={channel}
            hasPaidTicket={hasPaidTicket}
          />
        ))}

        {/* チケット購入セクション（お試し返信済みで未購入の場合） */}
        {hasTrialReply && !hasPaidTicket && !isClosed && !isFortuneOwner && (
          <motion.div
            id="buy-ticket-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-500/15 to-amber-600/5 border-2 border-amber-500/50 rounded-2xl p-5 space-y-4"
            style={{ boxShadow: "0 0 20px rgba(245,158,11,0.15)" }}
          >
            <div className="text-center space-y-1">
              <p className="text-xl">🔮</p>
              <p className="font-black text-amber-300">鑑定の続きを読みますか？</p>
              <p className="text-xs text-muted-foreground">チケット購入で全文表示＋追加2往復の本格鑑定</p>
            </div>
            <div className="bg-secondary/50 rounded-xl p-3 space-y-1 text-xs text-center">
              <p className="font-bold text-foreground">チケット内容</p>
              <p className="text-muted-foreground">✅ お試し返信の全文解放</p>
              <p className="text-muted-foreground">✅ 追加2往復（合計4通）の本格鑑定</p>
              <p className="text-amber-400 font-black text-lg mt-2">{ticketPrice} コイン</p>
            </div>
            <Button
              onClick={handleBuyTicket}
              disabled={buyingTicket}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-black gap-2 h-12 rounded-xl"
            >
              <Coins className="w-5 h-5" />
              {buyingTicket ? "購入中..." : `${ticketPrice}コインでチケットを購入`}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              コインが不足の場合は <Link to="/coin-charge" className="text-primary underline">こちら</Link> からチャージ
            </p>
          </motion.div>
        )}

        {/* 完了バナー */}
        {isClosed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" />
            <p className="font-black text-green-300">鑑定完了（2往復4通）</p>
            <p className="text-xs text-muted-foreground">お疲れ様でした。また新しい相談はチャンネルページから。</p>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input エリア ── */}
      {!isClosed && (
        <div className="px-4 py-3 border-t border-purple-500/20 bg-card/80 backdrop-blur shrink-0">
          {/* 占い師側: お試し返信ボタン or 通常返信 */}
          {isFortuneOwner ? (
            <div className="space-y-2">
              {!hasTrialReply && messages.length > 0 && (
                <Button
                  onClick={() => setShowTrialReplyModal(true)}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  お試し返信を送る（一部マスク）
                </Button>
              )}
              {(hasTrialReply || !canFortuneReply) && hasPaidTicket && (
                <div className="space-y-1">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
                      placeholder="本格鑑定の返信を入力..."
                      rows={2}
                      className="flex-1 resize-none rounded-xl bg-secondary border border-purple-500/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    />
                    <Button size="icon" onClick={handleFortuneReply} disabled={!input.trim() || sending}
                      className="w-12 h-12 bg-purple-600 hover:bg-purple-500">
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                  <p className={`text-[10px] text-right ${input.length >= MAX_INPUT ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                    {input.length} / {MAX_INPUT}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ユーザー側 */
            canUserSend && (
              <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                   <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                    placeholder={msgCount === 0 ? "相談内容を送ってください（無料お試し）..." : "続きのメッセージを入力..."}
                    rows={2}
                    className="w-full resize-none rounded-xl bg-secondary border border-purple-500/20 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                  />
                  <p className={`text-[10px] text-right ${input.length >= MAX_INPUT ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                    {input.length} / {MAX_INPUT}
                  </p>
                </div>
                <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending}
                  className="w-12 h-12 bg-purple-600 hover:bg-purple-500">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            )
          )}

          {/* ユーザー: お試し返信待ち案内 */}
          {!isFortuneOwner && msgCount === 1 && !hasTrialReply && (
            <p className="text-center text-xs text-muted-foreground mt-2 animate-pulse">
              🔮 占い師からのお試し鑑定をお待ちください...
            </p>
          )}
        </div>
      )}

      {/* ── お試し返信モーダル（占い師用） ── */}
      <AnimatePresence>
        {showTrialReplyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="bg-card border border-purple-500/50 rounded-2xl p-6 w-full max-w-md space-y-4"
              style={{ boxShadow: "0 0 40px rgba(168,85,247,0.2)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <p className="font-black text-purple-300">お試し返信を送る</p>
                </div>
                <button onClick={() => setShowTrialReplyModal(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 text-xs text-purple-300 space-y-1">
                <p className="font-bold">⚡ マスク表示について</p>
                <p>最初の{PREVIEW_CHARS}文字だけ相手に見えます。残りはぼかされ「チケット購入で全文を読む」導線が表示されます。</p>
              </div>
              <textarea
                value={trialReply}
                onChange={(e) => setTrialReply(e.target.value.slice(0, 500))}
                placeholder="鑑定の冒頭部分を書いてください。冒頭60文字が無料で見え、残りはマスクされます..."
                rows={6}
                className="w-full resize-none rounded-xl bg-secondary border border-purple-500/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              />
              <p className="text-[10px] text-muted-foreground text-right">{trialReply.length}/500</p>
              {trialReply.length > PREVIEW_CHARS && (
                <div className="bg-secondary rounded-xl p-3 text-xs space-y-1">
                  <p className="text-green-400 font-bold">プレビュー（相手に見える部分）:</p>
                  <p className="text-foreground">{trialReply.slice(0, PREVIEW_CHARS)}…</p>
                  <p className="text-muted-foreground">＋ {trialReply.length - PREVIEW_CHARS}文字がマスク</p>
                </div>
              )}
              <Button
                onClick={handleSendTrialReply}
                disabled={!trialReply.trim() || sendingTrialReply}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold gap-2"
              >
                <Send className="w-4 h-4" />
                {sendingTrialReply ? "送信中..." : "お試し返信を送信"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}