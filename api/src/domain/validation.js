import { z } from 'zod';
import { HttpError } from '../errors.js';
import { AREAS } from './areas.js';
import { inPhilippines, OUTSIDE_PH_MESSAGE } from './serviceArea.js';

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

// A Firestore document id: non-empty, no '/', not '.' or '..'. Anything else makes the database call throw (500).
export const isSafeId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 1500 && !v.includes('/') && v !== '.' && v !== '..';

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

export const PHONE_RE = /^(?=(?:\D*\d){7,15}\D*$)[0-9+()\-\s]{7,25}$/;
// Hotlines can be short service codes; syntax does not establish that a number is verified.
export const HOTLINE_RE = /^(?=(?:\D*\d){3,15}\D*$)[0-9+()\-\s]{3,40}$/;

const schema = z.object({
  type: z.enum(['flood', 'fire', 'earthquake', 'landslide', 'other']),
  description: z.preprocess((v) => (typeof v === 'string' ? sanitizeText(v, 1000) : undefined), z.string().min(3)),
  lat: coord(-90, 90),
  lng: coord(-180, 180),
  source: z.enum(['gps', 'manual']),
  addressText: z.preprocess((v) => (v == null ? undefined : sanitizeText(v, 300)), z.string().optional()),
  // The province or Metro Manila city the report is filed under. Chosen from the fixed list.
  // Optional. Current phone builds do not ask for it; older builds may still send one from the list.
  area: z.preprocess((v) => (v == null || v === '' ? undefined : v), z.enum(AREAS).optional()),
  // The town or city of the pin, such as Guiguinto. Optional; sent by current phone builds.
  locality: z.preprocess((v) => (typeof v === 'string' && v.trim() ? sanitizeText(v, 60).trim() : undefined), z.string().optional()),
  // Approximate place name for the pin, such as "Near Commonwealth Ave, Quezon City". Optional, shown next to the exact pin.
  placeName: z.preprocess((v) => (typeof v === 'string' && v.trim() ? sanitizeText(v, 120) : undefined), z.string().optional()),
  // How severe the resident says the situation is. Shown to staff; defaults to medium when a client does not send it.
  severity: z.preprocess((v) => (v == null || v === '' ? 'medium' : v), z.enum(['low', 'medium', 'high', 'critical'])),
  // How far the danger reaches from the reported point, in meters. Responders may act within this distance.
  affectedRadiusM: z.preprocess((v) => (v == null || v === '' ? undefined : Number(v)), z.number().int().min(50).max(5000).optional()),
  contact: z.object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().trim().regex(PHONE_RE),
  }).optional(),
}).superRefine((d, ctx) => {
  if (Number.isFinite(d.lat) && Number.isFinite(d.lng) && !inPhilippines(d.lat, d.lng)) {
    ctx.addIssue({ code: 'custom', path: ['lat'], message: OUTSIDE_PH_MESSAGE });
  }
});

export function parseReportInput(body) {
  const r = schema.safeParse(body ?? {});
  if (!r.success) {
    throw new HttpError(400, 'invalid_input', r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return r.data;
}
