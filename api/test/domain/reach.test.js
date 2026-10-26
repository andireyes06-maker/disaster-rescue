import { describe, it, expect } from 'vitest';
import { assertWithinReach, distanceMeters } from '../../src/domain/reach.js';

const report = (over = {}) => ({ location: { lat: 14.8512, lng: 120.8123 }, ...over });

describe('assertWithinReach', () => {
  it('refuses when no position is sent (400 position_required)', () => {
    expect(() => assertWithinReach(report(), undefined)).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => assertWithinReach(report(), { lat: 'x', lng: 1 })).toThrow();
  });

  it('allows a responder at the incident', () => {
    expect(() => assertWithinReach(report(), { lat: 14.8512, lng: 120.8123 })).not.toThrow();
  });

  it('uses the reported radius, not a fixed 500 m', () => {
    const near = { lat: 14.8512 + 0.0045, lng: 120.8123 }; // about 500 m north
    expect(() => assertWithinReach(report({ affectedRadiusM: 1000 }), near)).not.toThrow();
    expect(() => assertWithinReach(report({ affectedRadiusM: 200 }), near)).toThrow(expect.objectContaining({ status: 403 }));
  });

  it('defaults to 500 m for reports without a radius', () => {
    const far = { lat: 14.8512 + 0.0054, lng: 120.8123 }; // about 600 m north
    expect(() => assertWithinReach(report(), far)).toThrow(expect.objectContaining({ status: 403 }));
  });

  it('refuses a report with no location (409)', () => {
    expect(() => assertWithinReach({}, { lat: 14.85, lng: 120.81 })).toThrow(expect.objectContaining({ status: 409 }));
  });
});

describe('distanceMeters', () => {
  it('is about 111 meters per 0.001 degree of latitude', () => {
    expect(distanceMeters(14, 120, 14.001, 120)).toBeCloseTo(111.2, 0);
  });
});
