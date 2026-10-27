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
    const big = f(Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)]));
    expect(() => validatePhotos([big])).toThrow();
  });
});
describe('sanitizeText', () => {
  it('strips tags', () => { expect(sanitizeText('<script>x()</script>Help <b>now</b>', 500)).toBe('x()Help now'); });
  it('limits length', () => { expect(sanitizeText('a'.repeat(900), 500)).toHaveLength(500); });
});
describe('parseReportInput', () => {
  const ok = { type: 'flood', description: 'Water rising', lat: '14.85', lng: '120.81', source: 'gps', area: 'Quezon City', contact: { name: 'Ana', phone: '09171234567' } };
  it('parses numeric strings from multipart', () => { expect(parseReportInput(ok).lat).toBeCloseTo(14.85); });
  it.each([['abc', '120'], ['NaN', '120'], ['91', '120'], ['14', '181'], ['', '120']])('rejects lat=%s lng=%s', (lat, lng) => {
    expect(() => parseReportInput({ ...ok, lat, lng })).toThrow(expect.objectContaining({ status: 400 }));
  });
  it('rejects unknown type', () => { expect(() => parseReportInput({ ...ok, type: 'zombie' })).toThrow(); });
  it('keeps an approximate place name and strips markup from it', () => {
    expect(parseReportInput({ ...ok, placeName: 'Near <b>Malolos</b>, Bulacan' }).placeName).toBe('Near Malolos, Bulacan');
  });
  it('place name stays optional', () => { expect(parseReportInput(ok).placeName).toBeUndefined(); });
  it('keeps the severity the resident chose and defaults to medium', () => {
    expect(parseReportInput({ ...ok, severity: 'high' }).severity).toBe('high');
    expect(parseReportInput(ok).severity).toBe('medium');
  });
  it('refuses a severity outside the four levels', () => {
    expect(() => parseReportInput({ ...ok, severity: 'extreme' })).toThrow(expect.objectContaining({ status: 400 }));
  });
});

describe('carried-forward hardening', () => {
  const ok = { type: 'flood', description: 'Water rising', lat: '14.85', lng: '120.81', source: 'gps', area: 'Quezon City' };
  it.each(['0x10', '1e1', '+5', ' 1 2'])('rejects non-decimal lat %s', (lat) => {
    expect(() => parseReportInput({ ...ok, lat })).toThrow(expect.objectContaining({ status: 400 }));
  });
  it('rejects non-decimal lng', () => { expect(() => parseReportInput({ ...ok, lng: '1e1' })).toThrow(expect.objectContaining({ status: 400 })); });
  it('accepts trimmed decimals inside the Philippines', () => { expect(parseReportInput({ ...ok, lat: ' 14.5 ' }).lat).toBe(14.5); });
  it('rejects object description', () => { expect(() => parseReportInput({ ...ok, description: {} })).toThrow(expect.objectContaining({ status: 400 })); });
  it('rejects empty contact name', () => {
    expect(() => parseReportInput({ ...ok, contact: { name: '  ', phone: '09171234567' } })).toThrow(expect.objectContaining({ status: 400 }));
  });
  it('contact stays optional', () => { expect(parseReportInput(ok).contact).toBeUndefined(); });
  it.each([[null], ['x'], [{}], [{ length: 1 }]])('validatePhotos rejects non-array %j with 400', (v) => {
    if (v === null) return expect(() => validatePhotos(v)).not.toThrow();
    expect(() => validatePhotos(v)).toThrow(expect.objectContaining({ status: 400 }));
  });
  it('rejects a file without a Buffer', () => {
    expect(() => validatePhotos([{ buffer: 'abc', size: 3 }])).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => validatePhotos([{ size: 3 }])).toThrow(expect.objectContaining({ status: 400 }));
  });
  it('uses buffer length, not a spoofed size', () => {
    expect(() => validatePhotos([{ buffer: Buffer.alloc(0), size: 99 }])).toThrow(expect.objectContaining({ status: 400 }));
    const big = Buffer.concat([JPEG, Buffer.alloc(5 * 1024 * 1024)]);
    expect(() => validatePhotos([{ buffer: big, size: 10 }])).toThrow(expect.objectContaining({ status: 400 }));
  });
});
