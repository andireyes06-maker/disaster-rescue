// The API address must be set explicitly. There is no default, so a build cannot quietly
// send sign-in tokens and report data to a server the owner did not choose.
export type ApiBaseUrl = { ok: true; baseUrl: string } | { ok: false; reason: string };

export function resolveApiBaseUrl(raw: string | undefined): ApiBaseUrl {
  const value = (raw ?? '').trim();
  if (!value) {
    return { ok: false, reason: 'VITE_API_BASE_URL is not set.' };
  }
  const shapeReason = 'VITE_API_BASE_URL must be a full address starting with http:// or https://, such as http://localhost:3000/api.';
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: shapeReason };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: shapeReason };
  }
  return { ok: true, baseUrl: value.replace(/\/+$/, '') };
}
