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

// ページビュー・アプリログ送信を全て無効化
const noop = () => Promise.resolve();
if (base44) {
  if (typeof base44.trackPageView === 'function') base44.trackPageView = noop;
  if (typeof base44.analytics === 'object') {
    if (typeof base44.analytics.trackPageView === 'function') base44.analytics.trackPageView = noop;
    if (typeof base44.analytics.logUserInApp === 'function') base44.analytics.logUserInApp = noop;
    if (typeof base44.analytics.track === 'function') base44.analytics.track = noop;
  }
}