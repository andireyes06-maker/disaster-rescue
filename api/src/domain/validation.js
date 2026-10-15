import { z } from 'zod';
import { HttpError } from '../errors.js';

const MAX_PHOTOS = 5;
const MAX_BYTES = 5 * 1024 * 1024;

export function sniffImageType(buf) {
  if (!buf || buf.length < 3) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export function validatePhotos(files) {
  if (files == null) return;
  if (!Array.isArray(files)) throw new HttpError(400, 'invalid_photo', 'Photos must be a list of files');
  if (files.length > MAX_PHOTOS) throw new HttpError(400, 'too_many_photos', `At most ${MAX_PHOTOS} photos allowed`);
  for (const f of files) {
    if (!f || !Buffer.isBuffer(f.buffer)) throw new HttpError(400, 'invalid_photo', 'Photo is missing or unreadable');
    const size = f.buffer.length;
    if (size === 0) throw new HttpError(400, 'invalid_photo', 'Photo is empty');
    if (size > MAX_BYTES) throw new HttpError(400, 'photo_too_large', 'Photo exceeds 5 MB');
    if (!sniffImageType(f.buffer)) throw new HttpError(400, 'invalid_photo', 'Photo must be JPEG, PNG or WebP');
  }
}

export function sanitizeText(s, max) {
  return String(s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);
}

const coord = (min, max) => z.preprocess(
  (v) => {
    if (typeof v !== 'string') return v;
    const t = v.trim();
    return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : undefined;
  },
  z.number().finite().min(min).max(max),
);

export const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

const schema = z.object({
  type: z.enum(['flood', 'fire', 'earthquake', 'landslide', 'other']),
  description: z.preprocess((v) => (typeof v === 'string' ? sanitizeText(v, 1000) : undefined), z.string().min(3)),
  lat: coord(-90, 90),
  lng: coord(-180, 180),
  source: z.enum(['gps', 'manual']),
  addressText: z.preprocess((v) => (v == null ? undefined : sanitizeText(v, 300)), z.string().optional()),
  contact: z.object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().trim().regex(PHONE_RE),
  }).optional(),
});

export function parseReportInput(body) {
  const r = schema.safeParse(body ?? {});
  if (!r.success) {
    throw new HttpError(400, 'invalid_input', r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return r.data;
}
