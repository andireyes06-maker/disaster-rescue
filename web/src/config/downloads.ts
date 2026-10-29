// Version-pinned first-party APK release. Publish and verify this asset before
// deploying the website. A source-managed default avoids a missing hosting
// variable silently advertising Coming soon after an APK is already available.
export const DEFAULT_ANDROID_APK_URL = 'https://github.com/andireyes06-maker/rescue-reports-downloads/releases/download/android-online-2026-10-29-update20/I-Report-2026-10-29-update20-online.apk';
// Hosting can still override the public destination for a later approved build.
export const ANDROID_APK_URL: string = (import.meta.env.VITE_ANDROID_APK_URL ?? '').trim() || DEFAULT_ANDROID_APK_URL;
