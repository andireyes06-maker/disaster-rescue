import { mergeConfig } from '../../web/node_modules/vite/dist/node/index.js';
import base from '../../web/vite.config.js';
// Controlled test build only: production optimization with the emulator connection guard enabled.
export default mergeConfig(base, { define: { 'import.meta.env.DEV': 'true' } });
