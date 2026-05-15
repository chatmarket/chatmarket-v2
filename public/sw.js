/**
 * ChatMarket Service Worker v5
 * キャッシュ戦略:
 *   - App Shell (HTML/JS/CSS): Network First → キャッシュフォールバック
 *   - 画像/フォント: Cache First（長期キャッシュ）
 *   - API/外部: Network Only（キャッシュしない）
 */

const CACHE_NAME = 'chatmarket-v5';
const STATIC_CACHE = 'chatmarket-static-v5';
const IMAGE_CACHE = 'chatmarket-images-v5';

// キャッシュするApp Shellリソース
const APP_SHELL = [
  '/',
  '/index.html',
];

// キャッシュしないURLパターン（APIリクエスト等）
const NO_CACHE_PATTERNS = [
  /\/api\//,
  /base44\.com\/api/,
  /stripe\.com/,
  /amazonaws\.com/,
  /cloudfront\.net/,
  /live-video\.net/,
];

// ────────────────────────────────────────
// Install: App Shellを事前キャッシュ
// ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // App Shell取得失敗は無視（ネットワーク優先で動作継続）
      });
    }).then(() => self.skipWaiting())
  );
});

// ────────────────────────────────────────
// Activate: 古いキャッシュを削除
// ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const CURRENT_CACHES = [CACHE_NAME, STATIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !CURRENT_CACHES.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ────────────────────────────────────────
// Fetch: リクエスト種別ごとにキャッシュ戦略を切り替え
// ────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GETのみ処理
  if (request.method !== 'GET') return;

  // キャッシュしないパターン
  if (NO_CACHE_PATTERNS.some((p) => p.test(request.url))) return;

  // 画像: Cache First（1週間）
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, 7 * 24 * 60 * 60));
    return;
  }

  // フォント: Cache First（30日）
  if (url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
    event.respondWith(cacheFirst(request, STATIC_CACHE, 30 * 24 * 60 * 60));
    return;
  }

  // App Shell (HTML / JS / CSS): Network First → キャッシュフォールバック
  if (
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(networkFirst(request, STATIC_CACHE));
    return;
  }
});

// ────────────────────────────────────────
// Network First: ネットワーク優先、失敗時キャッシュ
// ────────────────────────────────────────
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

// ────────────────────────────────────────
// Cache First: キャッシュ優先、なければネットワーク
// ────────────────────────────────────────
async function cacheFirst(request, cacheName, maxAgeSeconds) {
  const cached = await caches.match(request);
  if (cached) {
    const dateHeader = cached.headers.get('date');
    if (dateHeader) {
      const age = (Date.now() - new Date(dateHeader).getTime()) / 1000;
      if (age < maxAgeSeconds) return cached;
    } else {
      return cached;
    }
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return cached || new Response('Offline', { status: 503 });
  }
}

// ────────────────────────────────────────
// Push通知受信（将来のVAPIDサーバープッシュ対応）
// ────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'ChatMarket', body: event.data.text() };
  }

  const options = {
    body: payload.body || '',
    icon: 'https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png',
    badge: 'https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png',
    tag: payload.tag || 'chatmarket',
    data: { url: payload.url || '/' },
    vibrate: [200, 100, 200],
    requireInteraction: payload.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'ChatMarket', options)
  );
});

// ────────────────────────────────────────
// 通知クリック: 対象URLに遷移
// ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
