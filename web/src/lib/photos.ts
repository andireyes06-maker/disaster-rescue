// Demo evidence is bundled with the web app under public/demo-evidence and stored as a stable key.
// Real evidence keeps its signed delivery URL unchanged.
const DEMO_PREFIX = 'demo-evidence/';

export function resolvePhotoUrl(url: string): string {
  return url.startsWith(DEMO_PREFIX) ? `${import.meta.env.BASE_URL}${url}` : url;
}
