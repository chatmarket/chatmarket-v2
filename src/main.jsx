import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker } from './lib/pushNotifications.js'

// ★ amazon-ivs-player v1.50.0 の EventEmitter クラッシュを防ぐポリフィル
// モバイルブラウザでは EventEmitter が存在しないためエラーになる
if (typeof window !== 'undefined') {
  // EventEmitter の最小限ポリフィル
  class MinimalEventEmitter {
    constructor() { this._events = {}; }
    on(e, fn) { (this._events[e] = this._events[e] || []).push(fn); return this; }
    off(e, fn) { if (this._events[e]) this._events[e] = this._events[e].filter(f => f !== fn); return this; }
    emit(e, ...a) { (this._events[e] || []).forEach(fn => fn(...a)); return this; }
    removeAllListeners(e) { if (e) delete this._events[e]; else this._events = {}; return this; }
  }
  // IVS SDK が参照するグローバルを事前に定義
  if (!window.EventEmitter) window.EventEmitter = MinimalEventEmitter;
  // Node.js の events モジュール互換
  if (typeof globalThis !== 'undefined' && !globalThis.EventEmitter) {
    globalThis.EventEmitter = MinimalEventEmitter;
  }
}

// グローバルレベルで /app-logs/ へのリクエストを遮断（fetch と axios 両方）
if (typeof window !== 'undefined') {
  // === fetch インターセプション ===
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    let url = String(args[0] || '');
    if (args[0] instanceof Request) {
      url = args[0].url;
    }
    
    if (url.includes('/app-logs/')) {
      console.log('[FETCH_INTERCEPT] Blocked /app-logs/ request');
      return Promise.resolve(new Response(JSON.stringify({}), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }));
    }
    return originalFetch.apply(this, args);
  };

  // === axios インターセプション（SDK が axios を使う場合）===
  // window.axios が存在する場合の対応
  if (window.axios) {
    window.axios.interceptors.request.use((config) => {
      if (config.url && config.url.includes('/app-logs/')) {
        console.log('[AXIOS_INTERCEPT] Blocked /app-logs/ request');
        return Promise.reject(new Error('Blocked'));
      }
      return config;
    }, (error) => Promise.reject(error));
  }

  // SDK のいかなるリクエストメソッドも /app-logs/ をターゲットにさせない
  const blockAppLogs = (originalMethod) => {
    return function(...args) {
      const [url] = args;
      if (typeof url === 'string' && url.includes('/app-logs/')) {
        console.log('[METHOD_OVERRIDE] Blocked /app-logs/ via method override');
        return Promise.resolve(new Response(JSON.stringify({}), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        }));
      }
      return originalMethod.apply(this, args);
    };
  };
}

// ★ SW強制クリア＆再登録停止（キャッシュが修正を妨害しないよう）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister();
      console.log('[SW] Force unregistered:', reg.scope);
    }
  });
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
        console.log('[SW] Cache cleared:', name);
      }
    });
  }
}
// Service Worker登録（PWAプッシュ通知用）
// registerServiceWorker(); // ★ 一時停止中（キャッシュ干渉対策）

// ローディング画面を消す
const hideLoader = () => {
  const loader = document.getElementById('app-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 400);
  }
};
// DOMContentLoaded後 or すでに完了済みなら即実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(hideLoader, 200));
} else {
  setTimeout(hideLoader, 200);
}

const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} else {
  console.error('Root element not found!')
}