// Shared helpers for release-integration checks. Emulator and local API only.
export const API = 'http://localhost:3102/api';
export const AUTH = 'http://localhost:9299/identitytoolkit.googleapis.com/v1';
export const FS = 'http://localhost:8190/v1/projects/demo-disaster-rescue/databases/(default)/documents';
export const PW = process.env.DEMO_PASSWORD;
if (!PW) throw new Error('DEMO_PASSWORD not set');

export async function signIn(email, password = PW) {
  const r = await fetch(`${AUTH}/accounts:signInWithPassword?key=fake-api-key`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`signIn ${email} ${r.status} ${j.error?.message}`);
  return j.idToken;
}

export async function api(method, path, token, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text };
}

// Firestore emulator REST read, owner bypass. Returns plain values for simple fields.
export async function fsDoc(collection, id) {
  const r = await fetch(`${FS}/${collection}/${id}`, { headers: { authorization: 'Bearer owner' } });
  if (r.status === 404) return null;
  const j = await r.json();
  return unwrap(j.fields ?? {});
}
export async function fsList(collection, pageSize = 300) {
  const r = await fetch(`${FS}/${collection}?pageSize=${pageSize}`, { headers: { authorization: 'Bearer owner' } });
  const j = await r.json();
  return (j.documents ?? []).map((d) => ({ id: d.name.split('/').pop(), ...unwrap(d.fields ?? {}) }));
}
function unwrap(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) out[k] = val(v);
  return out;
}
function val(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return unwrap(v.mapValue.fields ?? {});
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(val);
  return undefined;
}
