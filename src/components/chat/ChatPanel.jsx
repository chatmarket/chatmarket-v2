import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, DollarSign, Smile, Pin, PinOff, Shield, MoreVertical, X, ChevronsDown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import SuperChatModal from "./SuperChatModal";
import EmojiPicker from "./EmojiPicker";
import MotionMessage from "./MotionMessage";
import YellCoinBurst from "./YellCoinBurst";
import NgWordSettings from "./NgWordSettings";
import { useAiModeration } from "../../hooks/useAiModeration";

const superChatColors = {
  green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/40",
  yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/40",
  orange: "from-orange-500/20 to-orange-600/10 border-orange-500/40",
  red: "from-red-500/20 to-red-600/10 border-red-500/40",
};

export default function ChatPanel({ targetType, targetId }) {
  // チャット専用のtarget_type（コメントと分離するため "_chat" サフィックスを付与）
  const chatType = targetType + "_chat";
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [showSuperChat, setShowSuperChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNgSettings, setShowNgSettings] = useState(false);
  const [ngWords, setNgWords] = useState([]);
  const [pinnedCommentId, setPinnedCommentId] = useState(null);
  const [pinnedCommentText, setPinnedCommentText] = useState(null);
  const [pinnedCommentUser, setPinnedCommentUser] = useState(null);
  const [burst, setBurst] = useState(null);
  const [latestSuperChatId, setLatestSuperChatId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [aiBlocked, setAiBlocked] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollBottomRef = useRef(null);
  const queryClient = useQueryClient();
  const { checkMessage, scanMessages, filterMessages } = useAiModeration(ngWords);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (!targetId) return;
    base44.entities.LiveStream.filter({ id: targetId }).then((streams) => {
      const stream = streams[0];
      if (stream?.channel_id) {
        base44.entities.Channel.filter({ id: stream.channel_id }).then((ch) => {
          const c = ch[0];
          if (c) {
            setChannel(c);
            setNgWords(c.ng_words || []);
            setPinnedCommentId(c.pinned_comment_id || null);
            setPinnedCommentText(c.pinned_comment_text || null);
            setPinnedCommentUser(c.pinned_comment_user || null);
          }
        });
      }
    }).catch(() => {});
  }, [targetId]);

  const isOwner = channel && user && channel.owner_email === user.email;

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", chatType, targetId],
    queryFn: () => base44.entities.Comment.filter({ target_type: chatType, target_id: targetId }, "-created_date", 100),
    refetchInterval: 3000,
  });

  const { data: superChats = [] } = useQuery({
    queryKey: ["superchats", targetId],
    queryFn: () => base44.entities.SuperChat.filter({ livestream_id: targetId }, "-created_date", 50),
    refetchInterval: 3000,
    enabled: targetType === "livestream",
  });

  useEffect(() => {
    if (superChats.length === 0) return;
    const latest = superChats[0];
    if (latest.id !== latestSuperChatId) {
      if (latestSuperChatId !== null) {
        setBurst({ amount: latest.amount, userName: latest.user_name || "匿名" });
      }
      setLatestSuperChatId(latest.id);
    }
  }, [superChats]);

  const filterNg = useCallback((text) => {
    if (!ngWords.length) return true;
    const lower = text.toLowerCase();
    return !ngWords.some((w) => w && lower.includes(w.toLowerCase()));
  }, [ngWords]);

  const sendComment = useMutation({
    mutationFn: (content) =>
      base44.entities.Comment.create({
        content,
        target_type: chatType,
        target_id: targetId,
        user_name: user?.full_name || "匿名",
        user_email: user?.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", chatType, targetId] });
      setMessage("");
    },
  });

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !user) return;
    if (!filterNg(trimmed)) { setMessage(""); return; }
    // AI moderation check before posting
    const safe = await checkMessage(trimmed);
    if (!safe) {
      setMessage("");
      setAiBlocked(true);
      setTimeout(() => setAiBlocked(false), 3000);
      return;
    }
    sendComment.mutate(trimmed);
  };

  const handlePin = async (comment) => {
    if (!isOwner || !channel) return;
    const isAlreadyPinned = pinnedCommentId === comment.id;
    const newPinId = isAlreadyPinned ? null : comment.id;
    const newPinText = isAlreadyPinned ? null : comment.content;
    const newPinUser = isAlreadyPinned ? null : comment.user_name;
    await base44.entities.Channel.update(channel.id, {
      pinned_comment_id: newPinId,
      pinned_comment_text: newPinText,
      pinned_comment_user: newPinUser,
    });
    setPinnedCommentId(newPinId);
    setPinnedCommentText(newPinText);
    setPinnedCommentUser(newPinUser);
    setMenuOpenId(null);
  };

  // Scan incoming comments with AI moderation
  useEffect(() => {
    if (comments.length > 0) scanMessages(comments);
  }, [comments]);

  // 自動スクロール
  useEffect(() => {
    if (autoScroll) {
      scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [allMessages.length, autoScroll]);

  const allMessages = [
    ...filterMessages(comments.filter((c) => filterNg(c.content || ""))).map((c) => ({ ...c, type: "comment" })),
    ...superChats.map((s) => ({ ...s, type: "superchat" })),
  ].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border/50 relative">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">チャット</h3>
          <span className="text-[10px] text-green-400/70 flex items-center gap-1"><Shield className="w-3 h-3" />AIモデレーション中</span>
        </div>
        <button
          onClick={() => setAutoScroll((v) => !v)}
          title={autoScroll ? "自動スクロールON" : "自動スクロールOFF"}
          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all ${autoScroll ? "bg-primary/20 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground"}`}
        >
          <ChevronsDown className="w-3 h-3" />
          {autoScroll ? "自動↓" : "停止"}
        </button>
        {isOwner && (
          <button
            onClick={() => setShowNgSettings(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
          >
            <Shield className="w-3.5 h-3.5" />
            NGワード
          </button>
        )}
      </div>

      {/* 固定コメント */}
      <AnimatePresence>
        {pinnedCommentText && (
          <div className="mx-2 mt-2 bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 flex items-start gap-2">
            <Pin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-primary font-bold mb-0.5">{pinnedCommentUser} の固定コメント</p>
              <p className="text-xs text-foreground/80 break-words">{pinnedCommentText}</p>
            </div>
            {isOwner && (
              <button onClick={() => handlePin({ id: pinnedCommentId, content: pinnedCommentText, user_name: pinnedCommentUser })} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* メッセージ一覧 */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2" onWheel={() => setAutoScroll(false)}>
          {allMessages.map((msg) =>
            msg.type === "superchat" ? (
              <div
                key={`sc-${msg.id}`}
                className={`rounded-lg p-3 bg-gradient-to-r border ${superChatColors[msg.color] || superChatColors.green}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-primary">{msg.user_name}</span>
                  <span className="text-xs font-bold text-yellow-400">🪙 ¥{msg.amount?.toLocaleString()}</span>
                </div>
                {msg.message && <p className="text-sm">{msg.message}</p>}
              </div>
            ) : (
              <div
                key={`c-${msg.id}`}
                className="flex gap-2 items-start group relative"
              >
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold">{msg.user_name?.[0] || "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-primary">{msg.user_name} </span>
                  <MotionMessage content={msg.content} />
                </div>
                {isOwner && (
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === msg.id ? null : msg.id)}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {menuOpenId === msg.id && (
                      <div className="absolute right-0 top-6 z-20 bg-card border border-border/50 rounded-xl shadow-xl py-1 min-w-[130px]">
                        <button
                          onClick={() => handlePin(msg)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors"
                        >
                          {pinnedCommentId === msg.id
                            ? <><PinOff className="w-3.5 h-3.5 text-muted-foreground" /> 固定解除</>
                            : <><Pin className="w-3.5 h-3.5 text-primary" /> コメントを固定</>}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          )}
          <div ref={scrollBottomRef} />
        </div>
      </ScrollArea>

      {/* エールコインバースト */}
      <AnimatePresence>
        {burst && (
          <YellCoinBurst
            amount={burst.amount}
            userName={burst.userName}
            onDone={() => setBurst(null)}
          />
        )}
      </AnimatePresence>

      {/* 入力エリア */}
      {aiBlocked && (
        <div className="mx-3 mb-1 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
          <Shield className="w-3 h-3" /> このメッセージはAIモデレーションにより送信できませんでした
        </div>
      )}
      {user ? (
        <div className="p-3 border-t border-border/50 space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowSuperChat(true)}
              className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 text-xs gap-1 px-2"
            >
              <DollarSign className="w-3.5 h-3.5" />
              エールコイン
            </Button>
          </div>
          <div className="relative flex gap-2">
            {showEmojiPicker && (
              <EmojiPicker onSelect={(emoji) => setMessage((p) => p + emoji)} onClose={() => setShowEmojiPicker(false)} />
            )}
            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors text-xl ${
                showEmojiPicker ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Smile className="w-4 h-4" />
            </button>
            <form onSubmit={handleSend} className="flex flex-1 gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="コメントを入力..."
                className="bg-secondary border-0 text-sm flex-1"
                onFocus={() => setShowEmojiPicker(false)}
              />
              <Button type="submit" size="icon" className="shrink-0 bg-primary hover:bg-primary/90">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-border/50 text-center">
          <Button size="sm" variant="secondary" onClick={() => base44.auth.redirectToLogin()}>
            ログインしてコメント
          </Button>
        </div>
      )}

      {showSuperChat && (
        <SuperChatModal livestreamId={targetId} user={user} onClose={() => setShowSuperChat(false)} />
      )}

      {showNgSettings && channel && (
        <NgWordSettings
          channel={channel}
          onClose={() => setShowNgSettings(false)}
          onSaved={(words) => setNgWords(words)}
        />
      )}
    </div>
  );
}