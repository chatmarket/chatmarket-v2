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
if (base44) {
  if (typeof base44.trackPageView === 'function') base44.trackPageView = noop;
  if (base44.analytics) {
    if (typeof base44.analytics.trackPageView === 'function') base44.analytics.trackPageView = noop;
    if (typeof base44.analytics.logUserInApp === 'function') base44.analytics.logUserInApp = noop;
    if (typeof base44.analytics.track === 'function') {
      const originalTrack = base44.analytics.track.bind(base44.analytics);
      base44.analytics.track = (...args) => { try { return originalTrack(...args); } catch { return noop(); } };
    }
  }
  // SDK内部のHTTPログ送信をインターセプト
  if (base44._axios) {
    base44._axios.interceptors.request.use((config) => {
      if (config.url && config.url.includes('app-logs')) {
        return Promise.reject({ __suppressed: true });
      }
      return config;
    });
  }
}