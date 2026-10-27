import { describe, it, expect, vi } from 'vitest';
import { createPlaceLookup } from '../src/services/placeService.js';
describe('selected pin place lookup', () => {
  it('rounds coordinates, coalesces repeated pins and caches their address', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => ({ address: { road: 'River Road', suburb: 'Central', city: 'Harbor City' } }) }));
    const lookup = createPlaceLookup({ fetcher, wait: async () => {} });
    const [a, b] = await Promise.all([lookup(14.123456, 120.123456), lookup(14.123499, 120.123499)]);
    expect(a).toBe('River Road, Central, Harbor City'); expect(b).toBe(a);
    expect(await lookup(14.123456, 120.123456)).toBe(a); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0].searchParams.get('lat')).toBe('14.123');
    expect(fetcher.mock.calls[0][0].searchParams.get('lon')).toBe('120.123');
    expect(fetcher.mock.calls[0][1].headers['User-Agent']).toContain('I-Report');
  });
  it('serializes different pins with at least 1.1 seconds between request starts', async () => {
    let time = 0; const starts = [];
    const fetcher = vi.fn(async () => { starts.push(time); return { ok: true, json: async () => ({ address: { city: 'Harbor' } }) }; });
    const lookup = createPlaceLookup({ fetcher, now: () => time, wait: async ms => { time += ms; } });
    await Promise.all([lookup(14, 120), lookup(15, 121), lookup(16, 122)]);
    expect(starts).toEqual([0, 1100, 2200]);
  });
  it('does not invent an address when the provider fails', async () => {
    const lookup = createPlaceLookup({ fetcher: async () => { throw Error('offline'); }, wait: async () => {} });
    expect(await lookup(14, 120)).toBeNull();
  });
  it('bounds a backlog rather than accumulating unlimited provider requests', async () => {
    let finish; const gate = new Promise(resolve => { finish = resolve; });
    const lookup = createPlaceLookup({ fetcher: async () => { await gate; return { ok: false }; }, wait: async () => {} });
    const queued = Array.from({ length: 8 }, (_, i) => lookup(i, i));
    expect(await lookup(50, 50)).toBeNull(); finish(); await Promise.all(queued);
  });
});
