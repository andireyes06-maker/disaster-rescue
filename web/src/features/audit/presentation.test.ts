import { describe, expect, it } from 'vitest';
import { headquartersValue, namedValue } from './presentation';

const names = { users: {}, reports: {}, teams: {} };
const point = { lat: 7.080621198720183, lng: 125.54626464843751 };

describe('headquartersValue', () => {
  it('shows the place name recorded with the same event', () => {
    expect(headquartersValue(point, 'Guiguinto, Bulacan')).toBe('Guiguinto, Bulacan');
  });

  it('falls back to readable coordinates, not a serialized object, when no name was recorded', () => {
    const text = headquartersValue(point);
    expect(text).toBe('Coordinates 7.08062, 125.54626');
    expect(text).not.toContain('{');
    expect(text).not.toContain('"lat"');
  });

  it('ignores a blank recorded name and keeps the coordinate fallback', () => {
    expect(headquartersValue(point, '   ')).toBe('Coordinates 7.08062, 125.54626');
  });

  it('shows Not recorded for an empty previous headquarters', () => {
    expect(headquartersValue(null)).toBe('Not recorded');
    expect(headquartersValue(undefined)).toBe('Not recorded');
  });

  it('does not invent a name for a malformed point', () => {
    expect(headquartersValue({ lat: 'x' })).toBe('Location not readable');
  });

  it('is used by namedValue for the hq field only', () => {
    expect(namedValue('hq', point, names, 'Guiguinto, Bulacan')).toBe('Guiguinto, Bulacan');
    expect(namedValue('hq', null, names)).toBe('Not recorded');
  });
});
