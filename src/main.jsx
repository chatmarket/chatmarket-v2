import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker } from './lib/pushNotifications.js'

// グローバルレベルで /app-logs/ へのフェッチリクエストを遮断（SDKのログ機能を無効化）
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = String(args[0] || '');
    if (url.includes('/app-logs/')) {
      return Promise.resolve(new Response('', { status: 204 }));
    }
    return originalFetch.apply(this, args);
  };
}

// Service Worker登録（PWAプッシュ通知用）
registerServiceWorker();

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