import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    // Emulator-backed tests share one Firestore emulator; 5 s timeouts failed under load (audit 2026-10-24).
    testTimeout: 30000,
  },
});
