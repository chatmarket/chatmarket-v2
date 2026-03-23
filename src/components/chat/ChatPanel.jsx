import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, DollarSign } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SuperChatModal from "./SuperChatModal";

export default function ChatPanel({ targetType, targetId }) {
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const [showSuperChat, setShowSuperChat] = useState(false);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: comments = [] } = useQuery({
    queryKey: ["comments", targetType, targetId],
    queryFn: () => base44.entities.Comment.filter({ target_type: targetType, target_id: targetId }, "-created_date", 100),
    refetchInterval: 3000,
  });

  const { data: superChats = [] } = useQuery({
    queryKey: ["superchats", targetId],
    queryFn: () => base44.entities.SuperChat.filter({ livestream_id: targetId }, "-created_date", 50),
    refetchInterval: 3000,
    enabled: targetType === "livestream",
  });

  const sendComment = useMutation({
    mutationFn: (content) =>
      base44.entities.Comment.create({
        content,
        target_type: targetType,
        target_id: targetId,
        user_name: user?.full_name || "匿名",
        user_email: user?.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", targetType, targetId] });
      setMessage("");
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    sendComment.mutate(message.trim());
  };

  const allMessages = [
    ...comments.map((c) => ({ ...c, type: "comment" })),
    ...superChats.map((s) => ({ ...s, type: "superchat" })),
  ].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const superChatColors = {
    green: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/40",
    yellow: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/40",
    orange: "from-orange-500/20 to-orange-600/10 border-orange-500/40",
    red: "from-red-500/20 to-red-600/10 border-red-500/40",
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border/50">
      <div className="px-4 py-3 border-b border-border/50">
        <h3 className="font-semibold text-sm">チャット</h3>
      </div>

      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-2">
          {allMessages.map((msg) =>
            msg.type === "superchat" ? (
              <div
                key={`sc-${msg.id}`}
                className={`rounded-lg p-3 bg-gradient-to-r border ${superChatColors[msg.color] || superChatColors.green}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-primary">{msg.user_name}</span>
                  <span className="text-xs font-bold text-yellow-400">¥{msg.amount?.toLocaleString()}</span>
                </div>
                {msg.message && <p className="text-sm">{msg.message}</p>}
              </div>
            ) : (
              <div key={`c-${msg.id}`} className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold">{msg.user_name?.[0] || "?"}</span>
                </div>
                <div>
                  <span className="text-xs font-medium text-primary">{msg.user_name} </span>
                  <span className="text-sm text-foreground/80">{msg.content}</span>
                </div>
              </div>
            )
          )}
        </div>
      </ScrollArea>

      {user ? (
        <div className="p-3 border-t border-border/50">
          <form onSubmit={handleSend} className="flex gap-2">
            {targetType === "livestream" && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setShowSuperChat(true)}
                title="エールコインを送る"
              className="shrink-0 text-yellow-400 hover:text-yellow-300"
              >
                <DollarSign className="w-4 h-4" />
              </Button>
            )}
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="コメントを入力..."
              className="bg-secondary border-0 text-sm"
            />
            <Button type="submit" size="icon" className="shrink-0 bg-primary hover:bg-primary/90">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="p-3 border-t border-border/50 text-center">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => base44.auth.redirectToLogin()}
          >
            ログインしてコメント
          </Button>
        </div>
      )}

      {showSuperChat && (
        <SuperChatModal
          livestreamId={targetId}
          user={user}
          onClose={() => setShowSuperChat(false)}
        />
      )}
    </div>
  );
}