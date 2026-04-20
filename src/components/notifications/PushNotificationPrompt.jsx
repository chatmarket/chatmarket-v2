import React, { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestNotificationPermission, getNotificationPermission } from '@/lib/pushNotifications';

/**
 * プッシュ通知許可を促すバナー
 * 通知が未設定（default）のユーザーにのみ表示
 */
export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 少し遅らせて表示（UX改善）
    const timer = setTimeout(() => {
      const permission = getNotificationPermission();
      const dismissed = localStorage.getItem('cm_notif_dismissed');
      if (permission === 'default' && !dismissed) {
        setShow(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    setLoading(true);
    const granted = await requestNotificationPermission();
    setLoading(false);
    setShow(false);
    if (granted) {
      localStorage.setItem('cm_notif_dismissed', '1');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('cm_notif_dismissed', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-primary/40 rounded-2xl p-4 shadow-2xl shadow-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">通知を受け取りますか？</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              新着ライブ配信・通話リクエストをリアルタイムでお知らせします
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleAllow}
                disabled={loading}
                className="bg-primary text-black font-bold text-xs h-8 px-3"
              >
                {loading ? '...' : '許可する'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-xs h-8 px-3 text-muted-foreground"
              >
                後で
              </Button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}