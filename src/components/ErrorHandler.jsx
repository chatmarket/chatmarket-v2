import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * グローバル通信エラーハンドラー
 * - fetch/XHRのネットワークエラーをキャッチしてトーストで通知
 * - オフライン/オンライン状態の変化を通知
 */
export default function ErrorHandler() {
  useEffect(() => {
    // オフライン検知
    const handleOffline = () => {
      toast.error('インターネット接続が切れました', {
        description: 'ネットワークの状態をご確認ください',
        duration: 6000,
        id: 'network-offline',
      });
    };

    // オンライン復帰
    const handleOnline = () => {
      toast.success('接続が回復しました', {
        duration: 3000,
        id: 'network-online',
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // 未処理のPromiseエラーをキャッチ
    const handleUnhandledRejection = (event) => {
      const err = event.reason;
      if (!err) return;

      const msg = err?.message || String(err);

      // ネットワーク系エラー
      if (
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('network') ||
        msg.includes('fetch')
      ) {
        toast.error('通信エラーが発生しました', {
          description: 'しばらく待ってから再試行してください',
          duration: 5000,
          id: 'fetch-error',
        });
        event.preventDefault();
        return;
      }

      // 認証エラー (401/403)
      if (msg.includes('401') || msg.includes('403') || msg.includes('Unauthorized')) {
        toast.error('セッションが切れました', {
          description: 'ページを再読み込みしてログインし直してください',
          duration: 6000,
          id: 'auth-error',
        });
        event.preventDefault();
        return;
      }

      // サーバーエラー (500系)
      if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
        toast.error('サーバーエラーが発生しました', {
          description: '時間をおいて再試行してください',
          duration: 5000,
          id: 'server-error',
        });
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}