// Android APK download link. Set VITE_ANDROID_APK_URL at build time (Vercel
// environment variable) to the published APK URL. When empty, no download
// button is shown, so the site never links to a missing file.
export const ANDROID_APK_URL: string = (import.meta.env.VITE_ANDROID_APK_URL ?? '').trim();
