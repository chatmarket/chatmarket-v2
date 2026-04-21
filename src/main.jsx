import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerServiceWorker } from './lib/pushNotifications.js'

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