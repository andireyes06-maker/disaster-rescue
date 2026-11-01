import { describe, it, expect } from 'vitest';
import { assertWithinReach, parsePosition } from '../../src/domain/reach.js';

const report = { location: { lat: 14.8, lng: 120.9 }, affectedRadiusM: 300 };
const at = (dLat) => ({ lat: 14.8 + dLat, lng: 120.9 });

describe('assertWithinReach', () => {
  it('accepts a position inside the report danger radius', () => {
    expect(() => assertWithinReach(report, at(0.001))).not.toThrow(); // about 111 m
  });
  it('refuses a position outside the radius with 403 too_far', () => {
    try { assertWithinReach(report, at(0.037)); throw new Error('no throw'); } catch (e) {
      expect(e.status).toBe(403); expect(e.code).toBe('too_far'); expect(e.message).toMatch(/Move within 300 m/);
    }
  });
  it('refuses 4.1 km away', () => {
    expect(() => assertWithinReach(report, at(0.037))).toThrow();
  });
  it('uses 500 m when the report has no radius', () => {
    const old = { location: report.location };
    expect(() => assertWithinReach(old, at(0.004))).not.toThrow(); // about 445 m
    expect(() => assertWithinReach(old, at(0.006))).toThrow();     // about 667 m
  });
  it('requires a usable position (400 location_required)', () => {
    for (const bad of [undefined, null, {}, { lat: 'x', lng: 1 }, { lat: 95, lng: 0 }, 'nope']) {
      try { assertWithinReach(report, bad); throw new Error('no throw'); } catch (e) { expect(e.code).toBe('location_required'); }
    }
  });
  it('reads a multipart position sent as JSON text', () => {
    expect(parsePosition('{"lat":14.8,"lng":120.9}')).toEqual({ lat: 14.8, lng: 120.9 });
    expect(() => assertWithinReach(report, JSON.stringify(at(0.001)))).not.toThrow();
  });
});
