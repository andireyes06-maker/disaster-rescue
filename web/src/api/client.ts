import { getFirebaseAuth } from '../firebase-auth';
import { resolveApiBaseUrl } from './config';

export interface ApiErrorInit {
  status: number;
  code?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor({ status, code, message }: ApiErrorInit) {
    super(message || code || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export interface ApiOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
  getToken?: () => Promise<string | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Read at call time so a missing address fails the request with a clear error, not a silent default.
function apiBaseUrl(): string {
  const resolved = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
  if (!resolved.ok) throw new ApiError({ status: 0, code: 'config', message: `API address is not configured. ${resolved.reason}` });
  return resolved.baseUrl;
}

async function defaultGetToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  return user ? user.getIdToken() : null;
}

export async function api(
  path: string,
  { method = 'GET', body, formData, headers: extraHeaders, getToken = defaultGetToken }: ApiOptions = {},
): Promise<unknown> {
  const base = apiBaseUrl();
  const headers: Record<string, string> = { ...extraHeaders };
  let token: string | null;
  try {
    token = await getToken();
  } catch {
    throw new ApiError({ status: 0, code: 'auth', message: 'Could not get a sign-in token' });
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: FormData | string | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${base}/${String(path).replace(/^\/+/, '')}`, { method, headers, body: payload });
  } catch {
    throw new ApiError({ status: 0, code: 'network', message: 'Network error. Check your connection.' });
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  const record = isRecord(data) ? data : null;

  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      code: (typeof record?.error === 'string' && record.error) || `http_${res.status}`,
      message: (typeof record?.message === 'string' && record.message) || `Request failed (${res.status})`,
    });
  }
  return data;
}

// Binary downloads (CSV, PDF). Same sign-in token and error mapping as api(), but returns a Blob.
export async function apiBlob(
  path: string,
  options: Pick<ApiOptions, 'getToken'> = {},
): Promise<Blob> {
  return (await apiFile(path, options)).blob;
}

// Same request as apiBlob, plus the filename the server chose (Content-Disposition), so a demo
// export keeps its "demo-sample" name instead of the client's default.
export async function apiFile(
  path: string,
  { getToken = defaultGetToken }: Pick<ApiOptions, 'getToken'> = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const base = apiBaseUrl();
  const headers: Record<string, string> = {};
  let token: string | null;
  try {
    token = await getToken();
  } catch {
    throw new ApiError({ status: 0, code: 'auth', message: 'Could not get a sign-in token' });
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${base}/${String(path).replace(/^\/+/, '')}`, { method: 'GET', headers });
  } catch {
    throw new ApiError({ status: 0, code: 'network', message: 'Network error. Check your connection.' });
  }
  if (!res.ok) {
    throw new ApiError({ status: res.status, code: `http_${res.status}`, message: `Request failed (${res.status})` });
  }
  const disposition = res.headers?.get?.('content-disposition') ?? '';
  const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? null;
  return { blob: await res.blob(), filename };
}
