import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

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
        <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50">
            <p className="font-semibold text-sm">通知</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">通知はありません</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  to={n.link || "#"}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0 ${!n.is_read ? "bg-primary/5" : ""}`}
                >
                  {n.thumbnail_url ? (
                    <img src={n.thumbnail_url} alt="" className="w-12 h-8 object-cover rounded shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-12 h-8 bg-secondary rounded shrink-0 mt-0.5 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-snug truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(n.created_date).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 bg-primary rounded-full shrink-0 mt-1" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}