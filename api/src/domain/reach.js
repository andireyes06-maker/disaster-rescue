import { HttpError } from '../errors.js';

export const DEFAULT_REACH_M = 500;

// Great-circle distance in meters (haversine). Same formula as the phone app.
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// A responder may act only within the reach the resident reported. The position must come from the responder's
// device at the time of the action; without it, or outside the reach, the action is refused.
export function assertWithinReach(report, position) {
  const lat = Number(position?.lat);
  const lng = Number(position?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new HttpError(400, 'position_required', 'Your current location is needed to act on this incident. Turn on location and try again.');
  }
  if (!report.location || !Number.isFinite(report.location.lat) || !Number.isFinite(report.location.lng)) {
    throw new HttpError(409, 'location_missing', 'This report has no location, so distance cannot be checked.');
  }
  const limit = report.affectedRadiusM ?? DEFAULT_REACH_M;
  const d = distanceMeters(lat, lng, report.location.lat, report.location.lng);
  if (d > limit) {
    throw new HttpError(403, 'too_far', `You are ${Math.round(d)} m from this incident. You must be within ${limit} m to act on it.`);
  }
}
