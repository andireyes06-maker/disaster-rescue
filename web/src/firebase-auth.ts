import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, connectAuthEmulator, type Auth } from 'firebase/auth';

let auth: Auth | undefined;

export function shouldUseEmulators(env: { readonly DEV?: boolean; readonly VITE_USE_EMULATORS?: string }): boolean {
  return env.DEV === true && env.VITE_USE_EMULATORS === 'true';
}

// Lazy so that missing config never crashes module import (tests, first run).
export function getFirebaseApp(): FirebaseApp {
  const env = import.meta.env;
  return getApps()[0] || initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY || 'missing-api-key',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
    appId: env.VITE_FIREBASE_APP_ID,
  });
}

const authPort = () => Number(import.meta.env.VITE_AUTH_EMULATOR_PORT) || 9099;

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  const app = getFirebaseApp();
  // This product uses email/password only. Preserve the default persistence
  // fallbacks without initializing an unused popup/redirect iframe on public pages.
  auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence],
  });
  if (shouldUseEmulators(import.meta.env)) {
    connectAuthEmulator(auth, `http://localhost:${authPort()}`, { disableWarnings: true });
  }
  return auth;
}
