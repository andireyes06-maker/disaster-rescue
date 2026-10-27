// Approximate Philippine area, the same rule as the API (api/src/domain/serviceArea.js) and the phone.
// A pin the website accepts must also pass the server.
export function inPhilippines(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < 4.5 || lat > 21.3 || lng < 116.8 || lng > 127.0) return false;
  if (lat < 7.5 && lng < 119.3) return false;
  return true;
}

export const OUTSIDE_PH_MESSAGE = 'Pins must be inside the Philippines. Pick a place in the Philippines.';
