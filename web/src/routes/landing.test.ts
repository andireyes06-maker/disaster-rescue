import { describe, it, expect } from 'vitest';
import { landingFor } from './landing';

describe('landingFor', () => {
  it('sends each role to its own page', () => {
    expect(landingFor('dispatcher')).toBe('/dashboard');
    expect(landingFor('dmo')).toBe('/monitor');
    expect(landingFor('responder')).toBe('/assignments');
    expect(landingFor('resident')).toBe('/my');
    expect(landingFor('admin')).toBe('/admin');
  });

  it('sends a signed-out visitor to the forbidden page', () => {
    expect(landingFor(null)).toBe('/forbidden');
  });
});
