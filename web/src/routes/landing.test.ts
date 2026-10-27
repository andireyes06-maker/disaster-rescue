import { describe, it, expect } from 'vitest';
import { landingFor } from './landing';

describe('landingFor', () => {
  it('sends each role to its own page', () => {
    expect(landingFor('dispatcher')).toBe('/forbidden');
    expect(landingFor('responder')).toBe('/assignments');
    expect(landingFor('resident')).toBe('/forbidden');
    expect(landingFor('admin')).toBe('/dashboard');
  });

  it('sends a signed-out visitor to the forbidden page', () => {
    expect(landingFor(null)).toBe('/forbidden');
  });
});
