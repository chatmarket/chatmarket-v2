import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { base44Plugin } from '@base44/vite-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// amazon-ivs-player を完全なスタブに置き換えるカスタムプラグイン
function ivsPlayerStubPlugin() {
  const STUB_ID = '\0amazon-ivs-player-stub';
  return {
    name: 'ivs-player-stub',
    resolveId(id) {
      if (id === 'amazon-ivs-player') return STUB_ID;
    },
    load(id) {
      if (id === STUB_ID) {
        return `
          class EventEmitter {
            constructor() { this._e = {}; }
            on() { return this; }
            off() { return this; }
            emit() { return this; }
            removeAllListeners() { return this; }
          }
          export const isPlayerSupported = false;
          export const PlayerState = {};
          export const PlayerEventType = {};
          export const create = () => ({ load: () => {}, play: () => {}, pause: () => {}, delete: () => {} });
          export const registerIVSTech = () => {};
          export const registerIVSQualityPlugin = () => {};
          export default { isPlayerSupported: false, create, PlayerState: {}, PlayerEventType: {} };
        `;
      }
    },
  };
}

export default defineConfig({
  plugins: [
    base44Plugin(),
    react(),
    ivsPlayerStubPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['amazon-ivs-player'],
  },
});