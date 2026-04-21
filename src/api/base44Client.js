import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// ページビュー・アプリログ送信を全て無効化（本番ドメインで405エラーが出るため）
const noop = () => Promise.resolve();
const suppressedPromise = Promise.resolve();
if (base44) {
  if (typeof base44.trackPageView === 'function') base44.trackPageView = noop;
  if (base44.analytics) {
    if (typeof base44.analytics.trackPageView === 'function') base44.analytics.trackPageView = noop;
    if (typeof base44.analytics.logUserInApp === 'function') base44.analytics.logUserInApp = noop;
    if (typeof base44.analytics.track === 'function') base44.analytics.track = noop;
  }
  // SDK内部のHTTPインターセプタ: app-logsへのリクエストを完全に抑止
  if (base44._httpClient && base44._httpClient.interceptors && base44._httpClient.interceptors.request) {
    base44._httpClient.interceptors.request.use((config) => {
      if (config.url && config.url.includes('/app-logs/')) {
        return suppressedPromise;
      }
      return config;
    });
  }
}