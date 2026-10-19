// Validate deployment inputs without contacting Firebase or the API or printing secrets.
export function validateReleaseEnv(env) {
  const errors = [];
  try {
    const url = new URL((env.VITE_API_BASE_URL ?? '').trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(host) || host.endsWith('.localhost')) {
      errors.push('VITE_API_BASE_URL must use HTTPS and a deployed host, not localhost.');
    }
    if (url.username || url.password) errors.push('VITE_API_BASE_URL must not contain credentials.');
  } catch {
    errors.push('VITE_API_BASE_URL is required and must be a full deployed HTTPS address.');
  }
  for (const key of ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']) {
    if (!env[key]?.trim()) errors.push(`${key} is required for release.`);
  }
  if (env.VITE_FIREBASE_PROJECT_ID?.trim().startsWith('demo-')) errors.push('A demo Firebase project cannot be used for release.');
  if (env.VITE_USE_EMULATORS === 'true') errors.push('VITE_USE_EMULATORS must be false or unset for release.');
  return errors;
}
