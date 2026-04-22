/**
 * IncomingMessagesWidget
 * 配信者ダッシュボード用: 自分宛の未読DMメッセージ一覧を表示
 */
import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

export default function IncomingMessagesWidget({ userEmail }) {
  const queryClient = useQueryClient();

  const { data: messages = [] } = useQuery({
    queryKey: ["incoming-dm", userEmail],
    queryFn: () =>
      base44.entities.DirectChat.filter(
        { to_channel_owner_email: userEmail },
        "-created_date",
        50
      ),
    enabled: !!userEmail,
    refetchInterval: 5000,
  });

  // リアルタイム購読
  React.useEffect(() => {
    if (!userEmail) return;
    const unsub = base44.entities.DirectChat.subscribe((event) => {
      if (event.data?.to_channel_owner_email === userEmail) {
        queryClient.invalidateQueries({ queryKey: ["incoming-dm", userEmail] });
      }
    });
    return unsub;
  }, [userEmail, queryClient]);

  // スレッドごとにグループ化して最新メッセージだけ表示
  const threadMap = new Map();
  for (const msg of messages) {
    const tid = msg.thread_id || msg.from_email;
    if (!threadMap.has(tid)) {
      threadMap.set(tid, msg);
    }
  }
  const threads = Array.from(threadMap.values());
  const unreadCount = messages.filter((m) => !m.is_read).length;

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-sm">受信メッセージ</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
              未読 {unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* メッセージ一覧 */}
      {threads.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">まだメッセージはありません</p>
        </div>
      ) : (
        <div className="divide-y divide-border/30 max-h-[360px] overflow-y-auto">
          {threads.map((msg) => {
            const isUnread = !msg.is_read;
            return (
              <Link
                key={msg.id}
                to={`/creator-chat?fromEmail=${encodeURIComponent(msg.from_email)}`}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors ${isUnread ? "bg-primary/5" : ""}`}
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                  {(msg.from_name || msg.from_email || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-semibold truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                      {msg.from_name || msg.from_email}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {msg.created_date
                        ? formatDistanceToNow(new Date(msg.created_date), { addSuffix: true, locale: ja })
                        : ""}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                    {msg.yell_coin > 0 && (
                      <span className="text-yellow-400 font-bold mr-1">🪙 ×{msg.yell_coin}</span>
                    )}
                    {msg.content}
                  </p>
                </div>
                {isUnread && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}