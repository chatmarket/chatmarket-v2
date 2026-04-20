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

// trackPageView を無効化（405 エラー抑制）
if (base44 && typeof base44.trackPageView === 'function') {
  base44.trackPageView = () => {};
}
if (base44 && base44.analytics && typeof base44.analytics.trackPageView === 'function') {
  base44.analytics.trackPageView = () => {};
}