import { describe, expect, it } from 'vitest';
import { inPhilippines } from './serviceArea';

// The same points as api/test/domain/serviceArea.test.js.
describe('pins are only taken inside the Philippines (website)', () => {
  it.each([[14.5995, 120.9842], [14.8333, 120.8333], [7.1907, 125.4553], [20.45, 121.97], [5.03, 119.77], [9.8, 118.7], [6.08, 118.32]])('accepts %s, %s', (lat, lng) => {
    expect(inPhilippines(lat, lng)).toBe(true);
  });
  it.each([[5.98, 116.07], [5.84, 118.12], [6.88, 116.84], [25.03, 121.56], [35.68, 139.69], [21.03, 105.85], [3.14, 101.69], [7.5, 134.5], [5.84, 118.12], [5.03, 118.33], [4.48, 118.6]])('rejects %s, %s', (lat, lng) => {
    expect(inPhilippines(lat, lng)).toBe(false);
  });
});
