import { describe, it, expect } from 'vitest';
import { loadConfig, validateConfig } from '../src/config.js';

const full = {
  CLOUDINARY_CLOUD_NAME: 'c', CLOUDINARY_API_KEY: 'k', CLOUDINARY_API_SECRET: 's', GOOGLE_APPLICATION_CREDENTIALS: './sa.json',
};
describe('validateConfig', () => {
  it('passes with all required vars', () => { expect(() => validateConfig(loadConfig(full))).not.toThrow(); });
  it('names every missing var', () => {
    expect(() => validateConfig(loadConfig({}))).toThrow(/CLOUDINARY_CLOUD_NAME.*CLOUDINARY_API_KEY.*CLOUDINARY_API_SECRET.*GOOGLE_APPLICATION_CREDENTIALS/);
  });
  it('names a single missing var', () => {
    expect(() => validateConfig(loadConfig({ ...full, CLOUDINARY_API_KEY: '' }))).toThrow(/CLOUDINARY_API_KEY/);
  });
});
