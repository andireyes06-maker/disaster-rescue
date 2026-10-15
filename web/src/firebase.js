import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

let auth;
let db;

export function shouldUseEmulators(env) {
  return env.DEV === true && env.VITE_USE_EMULATORS === 'true';
}

// Lazy so that missing config never crashes module import (tests, first run).
function getApp() {
  const env = import.meta.env;
  return getApps()[0] || initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY || 'missing-api-key',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
    appId: env.VITE_FIREBASE_APP_ID,
  });
}

export function getFirebaseDb() {
  if (db) return db;
  db = getFirestore(getApp());
  if (shouldUseEmulators(import.meta.env)) {
    connectFirestoreEmulator(db, 'localhost', 8080);
  }
  return db;
}

export function getFirebaseAuth() {
  if (auth) return auth;
  const env = import.meta.env;
  const app = getApp();
  auth = getAuth(app);
  if (shouldUseEmulators(env)) {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  }
  return auth;
}
