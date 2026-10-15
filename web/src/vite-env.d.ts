// Typed view of the VITE_* variables this app reads. Vite's own ImportMetaEnv has no named keys for them.
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_USE_EMULATORS?: string;
}
