import { describe, it, expect } from 'vitest';
import { shouldUseEmulators } from './firebase';

describe('shouldUseEmulators', () => {
  it('requires DEV and the flag', () => {
    expect(shouldUseEmulators({ DEV: true, VITE_USE_EMULATORS: 'true' })).toBe(true);
    expect(shouldUseEmulators({ DEV: false, VITE_USE_EMULATORS: 'true' })).toBe(false);
    expect(shouldUseEmulators({ DEV: true, VITE_USE_EMULATORS: 'false' })).toBe(false);
    expect(shouldUseEmulators({})).toBe(false);
  });
});
