import { HttpError } from '../errors.js';
import { haversineMeters } from './duplicates.js';

// Reports made before the danger radius existed are treated as reaching 500 m, the same default new reports get.
export const DEFAULT_REACH_M = 500;

// The responder's position from a JSON body ({ lat, lng }) or from a multipart field (the same object as JSON text).
export function parsePosition(raw) {
  let p = raw;
  if (typeof p === 'string') {
    try { p = JSON.parse(p); } catch { return null; }
  }
  const lat = Number(p?.lat);
  const lng = Number(p?.lng);
  if (p?.lat == null || p?.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

// A responder may update a report only from within the danger radius the resident gave for it.
// Returns the position the device claimed and its distance, so the caller can record them: the position comes from the
// caller's own device, so it is evidence for an audit, not proof of where the responder was.
export function assertWithinReach(report, rawPosition) {
  const position = parsePosition(rawPosition);
  if (!position) throw new HttpError(400, 'location_required', 'Your location is needed to post an update. Turn on location and try again.');
  const loc = report?.location;
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return { position, distanceM: null, reachM: null };
  const reach = Number.isFinite(report.affectedRadiusM) && report.affectedRadiusM > 0 ? report.affectedRadiusM : DEFAULT_REACH_M;
  const away = Math.round(haversineMeters(position, loc));
  if (away > reach) {
    throw new HttpError(403, 'too_far', `You are about ${away} m from this incident. Move within ${reach} m of it to post an update.`);
  }
  return { position, distanceM: away, reachM: reach };
}
