import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * StreamNotificationCenter
 * ユーザーが受け取ったライバー配信開始通知を管理
 */
export default function StreamNotificationCenter({ user }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("unread"); // "all" | "unread"

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const res = await base44.entities.Notification.filter(
        { user_email: user.email },
        "-created_date",
        50
      );
      return res;
    },
    enabled: !!user?.email,
  });

  const markAsRead = useMutation({
    mutationFn: (notificationId) =>
      base44.entities.Notification.update(notificationId, { is_read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.email] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.all(
        unread.map((n) =>
          base44.entities.Notification.update(n.id, { is_read: true })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.email] });
      toast.success("すべての通知を既読にしました");
    },
  });

  const deleteNotification = useMutation({
    mutationFn: (notificationId) =>
      base44.entities.Notification.delete(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.email] });
      toast.success("通知を削除しました");
    },
  });

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!user) return null;

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-black">配信通知</h2>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="gap-2 text-primary hover:bg-primary/10"
          >
            <CheckCircle2 className="w-4 h-4" />
            すべて既読
          </Button>
        )}
      </div>

      {/* フィルター */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            filter === "unread"
              ? "bg-primary text-black"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          未読 ({unreadCount})
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            filter === "all"
              ? "bg-primary text-black"
              : "bg-secondary hover:bg-secondary/80"
          }`}
        >
          すべて ({notifications.length})
        </button>
      </div>

      {/* 通知リスト */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">
            {filter === "unread" ? "未読の通知はありません" : "通知がありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              className={`rounded-xl border p-4 transition-all ${
                notif.is_read
                  ? "bg-card border-border/50"
                  : "bg-primary/10 border-primary/50 shadow-lg shadow-primary/20"
              }`}
            >
              <div className="flex gap-3">
                {/* アイコン */}
                <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-lg">
                  {notif.type === "new_video" ? "📺" : "🔔"}
                </div>

                {/* コンテンツ */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base">{notif.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {notif.message}
                      </p>
                      {notif.channel_name && (
                        <p className="text-xs text-primary font-semibold mt-2">
                          {notif.channel_name}
                        </p>
                      )}
                    </div>
                    {!notif.is_read && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1" />
                    )}
                  </div>

                  {/* アクション */}
                  <div className="flex items-center gap-2 mt-3">
                    {notif.link && (
                      <a
                        href={notif.link}
                        className="text-xs sm:text-sm text-primary hover:underline font-semibold"
                      >
                        → 配信を見る
                      </a>
                    )}
                    <div className="flex-1" />
                    {!notif.is_read && (
                      <button
                        onClick={() => markAsRead.mutate(notif.id)}
                        disabled={markAsRead.isPending}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                        title="既読にする"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification.mutate(notif.id)}
                      disabled={deleteNotification.isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* タイムスタンプ */}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(notif.created_date).toLocaleString("ja-JP")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}