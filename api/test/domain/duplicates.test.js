import { describe, it, expect } from 'vitest';
import { haversineMeters, findPossibleDuplicates } from '../../src/domain/duplicates.js';
const now = new Date('2026-10-20T10:00:00Z');
const mk = (id, over = {}) => ({ id, type: 'flood', location: { lat: 14.85, lng: 120.81 }, createdAt: new Date('2026-10-20T08:00:00Z'), status: 'Submitted', ...over });
describe('duplicates', () => {
  it('distance sanity: 0.001 deg lat is about 111 m', () => {
    expect(haversineMeters({ lat: 14, lng: 120 }, { lat: 14.001, lng: 120 })).toBeGreaterThan(105);
    expect(haversineMeters({ lat: 14, lng: 120 }, { lat: 14.001, lng: 120 })).toBeLessThan(118);
  });
  it('flags same type, near, recent, open', () => {
    expect(findPossibleDuplicates(mk('new', { createdAt: now }), [mk('a')])).toEqual(['a']);
  });
  it('ignores other type, far, old, closed, and itself', () => {
    const n = mk('new', { createdAt: now });
    const others = [mk('t', { type: 'fire' }), mk('far', { location: { lat: 14.86, lng: 120.81 } }),
      mk('old', { createdAt: new Date('2026-10-19T00:00:00Z') }), mk('c', { status: 'Closed' }), mk('new')];
    expect(findPossibleDuplicates(n, others)).toEqual([]);
  });
  it('skips candidates with missing or non-numeric location', () => {
    const bad = [mk('n', { location: undefined }), mk('m', { location: { lat: 'x', lng: null } }), mk('z', { location: {} })];
    expect(findPossibleDuplicates(mk('new', { createdAt: now }), [...bad, mk('a')])).toEqual(['a']);
  });
});
