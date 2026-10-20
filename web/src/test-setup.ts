import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Every test uses one fake API address. Tests for the missing-address path stub it to '' themselves.
vi.stubEnv('VITE_API_BASE_URL', 'http://api.test/api');
