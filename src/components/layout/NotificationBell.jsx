import React, { useState, useEffect, useRef } from "react";
import { Bell, Flame, Radio, Heart, Phone, Trash2, CheckCircle2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function NotificationBell({ user }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, "-created_date", 20),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.email] }),
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.Notification.delete(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.email] });
      toast.success("通知を削除しました");
    },
  });

  // 通知タイプのアイコンを取得
  const getNotificationIcon = (type) => {
    switch (type) {
      case "new_video":
        return <Radio className="w-4 h-4 text-primary" />;
      case "giant_killing":
        return <Flame className="w-4 h-4 text-red-500" />;
      case "millionaire_achieved":
        return <Heart className="w-4 h-4 text-pink-500" />;
      case "top_supporter":
        return <Flame className="w-4 h-4 text-yellow-500" />;
      case "fortune_live_reminder":
        return <Sparkles className="w-4 h-4 text-violet-400" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen((v) => !v); if (!open && unreadCount > 0) markAllRead.mutate(); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
      >
        <Bell className="w-5 h-5 text-foreground/80" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-96 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px]">
          {/* ヘッダー */}
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
            <div>
              <p className="font-bold text-sm">通知</p>
              {unreadCount > 0 && <p className="text-xs text-primary mt-0.5">{unreadCount}件の未読</p>}
            </div>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={() => markAllRead.mutate()}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                すべて既読
              </Button>
            )}
          </div>

          {/* 通知リスト */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">通知はありません</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-border/30 hover:bg-secondary/30 transition-colors group ${
                    !n.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  {/* アイコン */}
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>

                  {/* コンテンツ */}
                  <Link
                    to={n.link || "#"}
                    onClick={() => setOpen(false)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <p className="text-xs font-bold text-foreground leading-snug">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {new Date(n.created_date).toLocaleDateString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </Link>

                  {/* アクション */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.is_read && <div className="w-2 h-2 bg-primary rounded-full" />}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        deleteNotification.mutate(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-1"
                      title="削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* フッター */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border/50 text-center shrink-0">
              <Link to="/notifications" onClick={() => setOpen(false)}>
                <Button variant="ghost" size="sm" className="text-xs w-full">
                  すべての通知を見る →
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}