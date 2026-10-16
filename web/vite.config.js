import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Large third-party groups load as their own files, so the entry script stays small (W14).
        manualChunks(id) {
          if (id.includes('node_modules/@firebase/firestore') || id.includes('node_modules/firebase/firestore')) return 'firestore';
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) return 'firebase';
          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) return 'maps';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'react';
          return undefined;
        },
      },
    },
  },
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
    exclude: ['node_modules', 'dist', 'e2e/**'],
  },
});
