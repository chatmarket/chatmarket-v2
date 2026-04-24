import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// グローバルレベルで /app-logs/ へのフェッチリクエストを遮断
// + 429エラー時は10秒間全リクエストをブロック
if (typeof window !== 'undefined') {
  let blockedUntil = 0;

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('/app-logs/')) {
      return Promise.resolve(new Response('', { status: 204 }));
    }
    // 429バックオフ中はリクエストを即座にreject
    if (Date.now() < blockedUntil) {
      const waitMs = blockedUntil - Date.now();
      console.warn(`[429_BACKOFF] Request blocked for ${Math.ceil(waitMs/1000)}s:`, typeof url === 'string' ? url.split('?')[0] : '');
      return Promise.resolve(new Response(JSON.stringify({ error: 'rate limited - backoff' }), { status: 429 }));
    }
    const res = await originalFetch.apply(this, args);
    if (res.status === 429) {
      blockedUntil = Date.now() + 10000; // 10秒バックオフ（429のみ、403は対象外）
      console.error('[429_BACKOFF] 429 detected! Blocking all requests for 10s');
    }
    // 403はバックオフしない（権限なし＝未ログインとして正常処理）
    return res;
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