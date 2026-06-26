import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Bell, Flame, Radio, Heart, Trash2, CheckCircle2, Filter, Clock, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const NOTIFICATION_TYPES = {
  new_video: { label: "新着動画", icon: Radio, color: "text-primary", bg: "bg-primary/10" },
  giant_killing: { label: "ジャイアントキリング", icon: Flame, color: "text-red-500", bg: "bg-red-500/10" },
  millionaire_achieved: { label: "ミリオネア達成", icon: Heart, color: "text-pink-500", bg: "bg-pink-500/10" },
  top_supporter: { label: "トップサポーター", icon: Flame, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  campaign_expiry_warning: { label: "無料期間終了案内", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-400/10" },
};

export default function NotificationCenter() {
  const [user, setUser] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then(setUser).catch(() => {});
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-center", user?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: user.email }, "-created_date", 100),
    enabled: !!user,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.all(unread.map((n) => base44.entities.Notification.update(n.id, { is_read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-center", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.email] });
      toast.success("すべての通知を既読にしました");
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId) => {
      await base44.entities.Notification.delete(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-center", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.email] });
    },
  });

  const deleteAllRead = useMutation({
    mutationFn: async () => {
      const readNotifications = notifications.filter((n) => n.is_read);
      await Promise.all(readNotifications.map((n) => base44.entities.Notification.delete(n.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-center", user?.email] });
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.email] });
      toast.success("既読の通知を削除しました");
    },
  });

  const filteredNotifications =
    filterType === "all"
      ? notifications
      : notifications.filter((n) => n.type === filterType);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const readCount = notifications.filter((n) => n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pt-24">
      {/* Header */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-black">通知センター</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-lg border border-border/50 p-3 text-center">
            <p className="text-2xl font-black text-primary">{notifications.length}</p>
            <p className="text-xs text-muted-foreground">総通知数</p>
          </div>
          <div className="bg-card rounded-lg border border-border/50 p-3 text-center">
            <p className="text-2xl font-black text-yellow-400">{unreadCount}</p>
            <p className="text-xs text-muted-foreground">未読</p>
          </div>
          <div className="bg-card rounded-lg border border-border/50 p-3 text-center">
            <p className="text-2xl font-black text-muted-foreground">{readCount}</p>
            <p className="text-xs text-muted-foreground">既読</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <span className="text-xs font-semibold text-muted-foreground">フィルター:</span>
          <button
            onClick={() => setFilterType("all")}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              filterType === "all"
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            すべて
          </button>
          {Object.entries(NOTIFICATION_TYPES).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                filterType === key
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border bg-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Bulk actions */}
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
        {readCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 text-destructive hover:text-red-600"
            onClick={() => deleteAllRead.mutate()}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            既読削除
          </Button>
        )}
      </div>

      {/* Notifications list */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border/50">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground text-sm">
              {filterType === "all"
                ? "通知はありません"
                : `${NOTIFICATION_TYPES[filterType]?.label}の通知はありません`}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const notifType = NOTIFICATION_TYPES[n.type] || NOTIFICATION_TYPES.new_video;
            const NotifIcon = notifType.icon;

            return (
              <Link
                key={n.id}
                to={n.link || "#"}
                className={`group block rounded-lg border border-border/50 overflow-hidden transition-all ${
                  !n.is_read ? "bg-primary/5 border-primary/30" : "bg-card hover:bg-secondary/30"
                }`}
              >
                <div className="p-4 flex items-start gap-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${notifType.bg}`}>
                    <NotifIcon className={`w-5 h-5 ${notifType.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-bold text-sm text-foreground">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2.5 h-2.5 bg-primary rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(n.created_date).toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          deleteNotification.mutate(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-1"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}