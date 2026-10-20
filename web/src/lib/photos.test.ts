import { describe, it, expect } from 'vitest';
import { resolvePhotoUrl } from './photos';

describe('resolvePhotoUrl', () => {
  it('resolves a demo evidence key to the bundled file under the app base path', () => {
    expect(resolvePhotoUrl('demo-evidence/sample-01.png')).toBe('/demo-evidence/sample-01.png');
  });
  it('leaves signed delivery URLs untouched', () => {
    const signed = 'https://res.cloudinary.com/demo/image/authenticated/s--abc--/v1/disaster-rescue/x.jpg';
    expect(resolvePhotoUrl(signed)).toBe(signed);
  });
});
