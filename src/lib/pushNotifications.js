/**
 * PWAプッシュ通知ユーティリティ
 * - Service Worker登録
 * - 通知許可リクエスト
 * - ローカル通知表示（バックエンドなしで動作）
 */

const SW_URL = '/sw.js';

/**
 * Service Workerを登録する
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_URL);
    console.log('[SW] Registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[SW] Registration failed:', err);
    return null;
  }
}

/**
 * 通知許可を要求する
 * @returns {Promise<boolean>} 許可されたか
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * 現在の通知許可状態を返す
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * ローカル通知を表示する（Service Worker経由）
 * @param {string} title
 * @param {object} options - { body, url, tag, requireInteraction }
 */
export async function showLocalNotification(title, options = {}) {
  if (!('serviceWorker' in navigator)) return;
  if (Notification.permission !== 'granted') return;

  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(title, {
    body: options.body || '',
    icon: 'https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png',
    badge: 'https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png',
    tag: options.tag || 'chatmarket',
    data: { url: options.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: options.requireInteraction || false,
  });
}

/**
 * 通話リクエスト通知
 */
export function notifyIncomingCall(callerName, callId) {
  return showLocalNotification(`📞 ${callerName}さんから通話リクエスト`, {
    body: 'タップして応答する',
    url: `/video-call/${callId}`,
    tag: `call-${callId}`,
    requireInteraction: true,
  });
}

/**
 * 新着ライブ配信通知
 */
export function notifyNewLiveStream(channelName, streamId) {
  return showLocalNotification(`🔴 ${channelName}がライブ配信中！`, {
    body: 'タップして視聴する',
    url: `/live/${streamId}`,
    tag: `live-${streamId}`,
  });
}

/**
 * 新着動画通知
 */
export function notifyNewVideo(channelName, videoId) {
  return showLocalNotification(`🎬 ${channelName}が新しい動画を公開`, {
    body: 'タップして視聴する',
    url: `/watch/${videoId}`,
    tag: `video-${videoId}`,
  });
}