import { describe, it, expect } from 'vitest';
import { sniffImageType, validatePhotos, sanitizeText, parseReportInput } from '../../src/domain/validation.js';
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
const f = (buffer) => ({ buffer, size: buffer.length, originalname: 'a.jpg' });

describe('sniffImageType', () => {
  it('detects real types', () => {
    expect(sniffImageType(JPEG)).toBe('image/jpeg');
    expect(sniffImageType(PNG)).toBe('image/png');
    expect(sniffImageType(WEBP)).toBe('image/webp');
  });
  it('rejects fakes', () => { expect(sniffImageType(Buffer.from('MZ\x90\x00exe'))).toBeNull(); });
});
describe('validatePhotos', () => {
  it('accepts up to 5 valid photos', () => { expect(() => validatePhotos([f(JPEG), f(PNG)])).not.toThrow(); });
  it('rejects a sixth photo', () => { expect(() => validatePhotos(Array(6).fill(f(JPEG)))).toThrow(expect.objectContaining({ status: 400 })); });
  it('rejects zero-byte file', () => { expect(() => validatePhotos([f(Buffer.alloc(0))])).toThrow(); });
  it('rejects fake .jpg', () => { expect(() => validatePhotos([f(Buffer.from('MZ\x90\x00'))])).toThrow(); });
  it('rejects over 5 MB', () => {
    const big = { buffer: JPEG, size: 5 * 1024 * 1024 + 1, originalname: 'a.jpg' };
    expect(() => validatePhotos([big])).toThrow();
  });
});
describe('sanitizeText', () => {
  it('strips tags', () => { expect(sanitizeText('<script>x()</script>Help <b>now</b>', 500)).toBe('x()Help now'); });
  it('limits length', () => { expect(sanitizeText('a'.repeat(900), 500)).toHaveLength(500); });
});
describe('parseReportInput', () => {
  const ok = { type: 'flood', description: 'Water rising', lat: '14.85', lng: '120.81', source: 'gps', contact: { name: 'Ana', phone: '09171234567' } };
  it('parses numeric strings from multipart', () => { expect(parseReportInput(ok).lat).toBeCloseTo(14.85); });
  it.each([['abc', '120'], ['NaN', '120'], ['91', '120'], ['14', '181'], ['', '120']])('rejects lat=%s lng=%s', (lat, lng) => {
    expect(() => parseReportInput({ ...ok, lat, lng })).toThrow(expect.objectContaining({ status: 400 }));
  });
  it('rejects unknown type', () => { expect(() => parseReportInput({ ...ok, type: 'zombie' })).toThrow(); });
});
