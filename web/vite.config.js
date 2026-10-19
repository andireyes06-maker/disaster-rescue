import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sourceIdentityPlugin } from './scripts/source-identity.mjs';

export default defineConfig({
  plugins: [react(), tailwindcss(), sourceIdentityPlugin(fileURLToPath(new URL('.', import.meta.url)))],
  // Let route imports define chunk ownership. The previous manual groups placed
  // shared React code inside the maps chunk, forcing Leaflet onto the landing page.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
    // The full suite runs many jsdom files in parallel; typing-heavy tests need more than the default 5 s.
    testTimeout: 20000,
    exclude: ['node_modules', 'dist', 'e2e/**', 'scripts/source-identity.test.mjs'],
  },
});
