import { getFirebaseAuth } from '../firebase';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

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
  getToken?: () => Promise<string | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function defaultGetToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  return user ? user.getIdToken() : null;
}

export async function api(
  path: string,
  { method = 'GET', body, formData, getToken = defaultGetToken }: ApiOptions = {},
): Promise<unknown> {
  const headers: Record<string, string> = {};
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
    res = await fetch(`${BASE_URL}/${String(path).replace(/^\/+/, '')}`, { method, headers, body: payload });
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
