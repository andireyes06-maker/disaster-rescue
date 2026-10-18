import { mergeConfig } from '/private/tmp/rescue-release-integration-2026-10-18/web/node_modules/vite/dist/node/index.js';
import base from '/private/tmp/rescue-release-integration-2026-10-18/web/vite.config.js';
// Render-only test build: production optimization with the emulator connection guard enabled.
export default mergeConfig(base, { define: { 'import.meta.env.DEV': 'true' } });
