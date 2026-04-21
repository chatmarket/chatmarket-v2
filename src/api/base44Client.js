import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// グローバルレベルで /app-logs/ へのフェッチリクエストを遮断
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('/app-logs/')) {
      return Promise.resolve(new Response('', { status: 204 }));
    }
    return originalFetch.apply(this, args);
  };
}

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// SDK 初期化直後に logUserInApp が呼び出されるのを防ぐため、
// 内部メソッドを全て無効化
if (base44 && typeof base44 === 'object') {
  // すべての内部メソッドをスキャンして /app-logs/ に関連するものを無効化
  for (const key in base44) {
    try {
      if (typeof base44[key] === 'function') {
        const original = base44[key];
        base44[key] = function(...args) {
          const argStr = JSON.stringify(args).toLowerCase();
          if (argStr.includes('app-logs') || argStr.includes('log')) {
            console.log(`[SDK_OVERRIDE] Method ${key} blocked`);
            return Promise.resolve();
          }
          return original.apply(this, args);
        };
      }
    } catch (e) {
      // silent
    }
  }
}

// ページビュー・アプリログ送信を全て無効化
const noop = () => {
  console.log('[BASE44_NOOP] Analytics method called but disabled');
  return Promise.resolve();
};

if (base44) {
  if (typeof base44.trackPageView === 'function') {
    base44.trackPageView = noop;
  }
  if (typeof base44.analytics === 'object' && base44.analytics) {
    if (typeof base44.analytics.trackPageView === 'function') {
      base44.analytics.trackPageView = noop;
    }
    if (typeof base44.analytics.logUserInApp === 'function') {
      base44.analytics.logUserInApp = noop;
    }
    if (typeof base44.analytics.track === 'function') {
      base44.analytics.track = noop;
    }
  }
}