import { describe, it, expect } from 'vitest';
import { inPhilippines } from '../../src/domain/serviceArea.js';

describe('pins are only taken inside the Philippines', () => {
  it.each([
    ['Manila', 14.5995, 120.9842],
    ['Guiguinto, Bulacan', 14.8333, 120.8333],
    ['Davao', 7.1907, 125.4553],
    ['Batanes', 20.45, 121.97],
    ['Tawi-Tawi', 5.03, 119.77],
    ['Palawan', 9.8, 118.7],
    ['Davao Oriental', 6.9, 126.5],
  ])('accepts %s', (_name, lat, lng) => {
    expect(inPhilippines(lat, lng)).toBe(true);
  });

  it.each([
    ['Kota Kinabalu, Sabah', 5.98, 116.07],
    ['Sandakan, Sabah', 5.84, 118.12],
    ['Kudat, Sabah', 6.88, 116.84],
    ['Taipei, Taiwan', 25.03, 121.56],
    ['Tokyo', 35.68, 139.69],
    ['Hanoi', 21.03, 105.85],
    ['Kuala Lumpur', 3.14, 101.69],
    ['Palau', 7.5, 134.5],
    ['Not a number', Number.NaN, 120],
  ])('rejects %s', (_name, lat, lng) => {
    expect(inPhilippines(lat, lng)).toBe(false);
  });
});
