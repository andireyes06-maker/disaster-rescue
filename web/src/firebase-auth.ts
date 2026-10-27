import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { initializeAuth, browserSessionPersistence, connectAuthEmulator, type Auth } from 'firebase/auth';

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
  // Session-only sign-in: the session lasts while the tab is open (no idle logout, so an admin
  // can stay on screen for an emergency) and ends when the tab closes.
  auth = initializeAuth(app, {
    persistence: [browserSessionPersistence],
  });
  if (shouldUseEmulators(import.meta.env)) {
    connectAuthEmulator(auth, `http://localhost:${authPort()}`, { disableWarnings: true });
  }
  return auth;
}
