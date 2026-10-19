import { describe, expect, it } from 'vitest';
import { validateReleaseEnv } from './release-env.mjs';

const valid = {
  VITE_API_BASE_URL: 'https://api.example.com/api',
  VITE_FIREBASE_API_KEY: 'test-public-client-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'project.example.com',
  VITE_FIREBASE_PROJECT_ID: 'release-project',
  VITE_FIREBASE_APP_ID: 'test-app-id',
};
describe('release environment', () => {
  it('accepts a complete deployment configuration', () => {
    expect(validateReleaseEnv(valid)).toEqual([]);
  });
  it('rejects a missing API address before deployment', () => {
    expect(validateReleaseEnv({ ...valid, VITE_API_BASE_URL: '' })).not.toEqual([]);
  });
  it.each(['http://api.example.com', 'https://localhost/api', 'https://127.0.0.1/api', 'https://[::1]/api', 'https://preview.localhost/api'])('rejects an undeployable API address: %s', (url) => {
    expect(validateReleaseEnv({ ...valid, VITE_API_BASE_URL: url })).not.toEqual([]);
  });
  it('rejects emulator or incomplete Firebase configuration', () => {
    expect(validateReleaseEnv({ ...valid, VITE_USE_EMULATORS: 'true' })).not.toEqual([]);
    expect(validateReleaseEnv({ ...valid, VITE_FIREBASE_PROJECT_ID: 'demo-rescue' })).not.toEqual([]);
    expect(validateReleaseEnv({ ...valid, VITE_FIREBASE_API_KEY: '' })).not.toEqual([]);
  });
  it('does not expose credentials in a configuration error', () => {
    const errors = validateReleaseEnv({ ...valid, VITE_API_BASE_URL: 'https://secret-user:secret-pass@api.example.com' });
    expect(errors).not.toEqual([]);
    expect(errors.join(' ')).not.toMatch(/secret-user|secret-pass/);
  });
});
