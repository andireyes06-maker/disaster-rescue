import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
it('defaults to the version-pinned owned HTTPS APK release', async () => {
  vi.stubEnv('VITE_ANDROID_APK_URL', '');
  const { ANDROID_APK_URL } = await import('./downloads');
  const url = new URL(ANDROID_APK_URL);
  expect(url.protocol).toBe('https:');
  expect(url.hostname).toBe('github.com');
  expect(url.pathname).toBe('/andireyes06-maker/rescue-reports-downloads/releases/download/android-online-2026-10-29-update20/I-Report-2026-10-29-update20-online.apk');
});
it('retains an explicitly configured hosting download', async () => {
  vi.stubEnv('VITE_ANDROID_APK_URL', '  https://downloads.example.test/approved.apk  ');
  const { ANDROID_APK_URL } = await import('./downloads');
  expect(ANDROID_APK_URL).toBe('https://downloads.example.test/approved.apk');
});
