import { getFirebaseAuth } from '../firebase.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export class ApiError extends Error {
  constructor({ status, code, message }) {
    super(message || code || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function defaultGetToken() {
  const user = getFirebaseAuth().currentUser;
  return user ? user.getIdToken() : null;
}

export async function api(path, { method = 'GET', body, formData, getToken = defaultGetToken } = {}) {
  const headers = {};
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError({ status: 0, code: 'network', message: 'Network error. Check your connection.' });
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    throw new ApiError({
      status: res.status,
      code: (data && data.error) || `http_${res.status}`,
      message: (data && data.message) || text || `Request failed (${res.status})`,
    });
  }
  return data;
}
