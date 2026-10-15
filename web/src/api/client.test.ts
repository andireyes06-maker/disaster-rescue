import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../firebase', () => ({ getFirebaseAuth: () => ({ currentUser: null }) }));
import { api, ApiError } from './client';

// The fields these tests read from the fetch init. Headers are always a plain record in this app.
type FetchInit = { headers: Record<string, string>; body?: unknown };
const fetchCall = (i: number): [string, FetchInit] => vi.mocked(fetch).mock.calls[i] as unknown as [string, FetchInit];

const getToken = async () => 'tok123';

function mockFetch(status: number, body: unknown, isJson = true) {
  globalThis.fetch = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (isJson ? JSON.stringify(body) : String(body)),
  })) as unknown as typeof fetch;
}

describe('api()', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('adds the Bearer header and sends a JSON body', async () => {
    mockFetch(200, { ok: true });
    const res = await api('/reports', { method: 'POST', body: { a: 1 }, getToken });
    expect(res).toEqual({ ok: true });
    const [url, init] = fetchCall(0);
    expect(url).toMatch(/\/reports$/);
    expect(init.headers.Authorization).toBe('Bearer tok123');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
  });

  it('throws ApiError with code on a 409 JSON body', async () => {
    mockFetch(409, { error: 'conflict', message: 'Already reviewed' });
    await expect(api('/x', { getToken })).rejects.toMatchObject({
      status: 409,
      code: 'conflict',
      message: 'Already reviewed',
    });
    await expect(api('/x', { getToken })).rejects.toBeInstanceOf(ApiError);
  });

  it('tolerates non-JSON error bodies', async () => {
    mockFetch(502, 'Bad gateway', false);
    await expect(api('/x', { getToken })).rejects.toMatchObject({ status: 502 });
  });

  it('throws status 0 code network on fetch failure', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('failed');
    }) as unknown as typeof fetch;
    await expect(api('/x', { getToken })).rejects.toMatchObject({ status: 0, code: 'network' });
  });

  it('does not set Content-Type for FormData', async () => {
    mockFetch(200, {});
    const fd = new FormData();
    fd.append('f', 'v');
    await api('/upload', { method: 'POST', formData: fd, getToken });
    const init = fetchCall(0)[1];
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.body).toBe(fd);
  });

  it('joins base and path with exactly one slash', async () => {
    mockFetch(200, {});
    await api('reports', { getToken });
    await api('//reports', { getToken });
    for (const c of vi.mocked(fetch).mock.calls) expect(c[0]).toMatch(/[^/]\/reports$/);
    expect(fetchCall(0)[0]).not.toMatch(/\/\/reports/);
  });

  it('wraps token failures as ApiError status 0 code auth', async () => {
    mockFetch(200, {});
    await expect(api('/x', { getToken: async () => { throw new Error('boom'); } })).rejects.toMatchObject({
      status: 0, code: 'auth', message: 'Could not get a sign-in token',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never uses a raw HTML body as the message', async () => {
    mockFetch(500, '<html>secret stack</html>', false);
    await expect(api('/x', { getToken })).rejects.toMatchObject({ message: 'Request failed (500)' });
  });

  it('returns null for an empty 204 body', async () => {
    mockFetch(204, '', false);
    expect(await api('/x', { getToken })).toBeNull();
  });
});
