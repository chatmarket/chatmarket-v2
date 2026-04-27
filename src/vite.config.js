import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { base44Plugin } from '@base44/vite-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    base44Plugin(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      // amazon-ivs-player をバンドルから完全除外（HLS.jsのみ使用）
      external: ['amazon-ivs-player'],
    },
  },
  optimizeDeps: {
    // 依存関係の事前バンドルからも除外
    exclude: ['amazon-ivs-player'],
  },
});