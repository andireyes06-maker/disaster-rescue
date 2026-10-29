import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ get: vi.fn(), connect: vi.fn(), attach: vi.fn() }));
vi.mock('firebase/firestore', () => ({ getFirestore: sdk.get, connectFirestoreEmulator: sdk.connect }));
vi.mock('./firebase-emulator-lifecycle', () => ({ attachEmulatorLifecycle: sdk.attach }));
vi.mock('./firebase-auth', () => ({ getFirebaseApp: () => ({}), getFirebaseAuth: vi.fn(), shouldUseEmulators: (env: { DEV?: boolean; VITE_USE_EMULATORS?: string }) => env.DEV === true && env.VITE_USE_EMULATORS === 'true' }));
beforeEach(() => {
  vi.resetModules();
  sdk.get.mockReset().mockReturnValue({});
  sdk.connect.mockReset();
  sdk.attach.mockReset().mockReturnValue(vi.fn());
});
afterEach(() => vi.unstubAllEnvs());
it.each([false, true])('never installs emulator lifecycle handling in production (flag %s)', async (flag) => {
  vi.stubEnv('DEV', false);
  vi.stubEnv('VITE_USE_EMULATORS', String(flag));
  const { getFirebaseDb } = await import('./firebase');
  getFirebaseDb();
  expect(sdk.connect).not.toHaveBeenCalled();
  expect(sdk.attach).not.toHaveBeenCalled();
});
it('installs one lifecycle handler for a local emulator connection', async () => {
  vi.stubEnv('DEV', true);
  vi.stubEnv('VITE_USE_EMULATORS', 'true');
  vi.stubEnv('VITE_FIRESTORE_EMULATOR_PORT', '8637');
  const { getFirebaseDb } = await import('./firebase');
  getFirebaseDb(); getFirebaseDb();
  expect(sdk.connect).toHaveBeenCalledTimes(1);
  expect(sdk.connect).toHaveBeenCalledWith(expect.anything(), 'localhost', 8637);
  expect(sdk.attach).toHaveBeenCalledTimes(1);
});
