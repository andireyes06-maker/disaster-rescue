import { describe, it, expect } from 'vitest';
import { resolveApiBaseUrl } from './config';

describe('resolveApiBaseUrl', () => {
  it('rejects a missing or blank value with a reason', () => {
    for (const value of [undefined, '', '   ']) {
      const result = resolveApiBaseUrl(value);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toMatch(/VITE_API_BASE_URL is not set/);
    }
  });

  it('rejects a value that is not a full address', () => {
    const result = resolveApiBaseUrl('localhost:3000/api');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/full address/);
  });

  it('rejects a non-http protocol', () => {
    const result = resolveApiBaseUrl('ftp://example.test/api');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/http:\/\/ or https:\/\//);
  });

  it('accepts http and https addresses and drops trailing slashes', () => {
    expect(resolveApiBaseUrl('http://localhost:3000/api/')).toEqual({ ok: true, baseUrl: 'http://localhost:3000/api' });
    expect(resolveApiBaseUrl(' https://api.example.test/api ')).toEqual({ ok: true, baseUrl: 'https://api.example.test/api' });
  });

  it('never falls back to localhost:8080', () => {
    const result = resolveApiBaseUrl(undefined);
    expect(JSON.stringify(result)).not.toMatch(/8080/);
  });
});
