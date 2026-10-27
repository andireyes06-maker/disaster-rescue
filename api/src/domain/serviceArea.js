// The app only takes pins inside the Philippines. This is an approximate box, not a border.
// It is wide enough for every island group, from Batanes to Tawi-Tawi and east to Davao Oriental.
export const PH_BOUNDS = { minLat: 4.5, maxLat: 21.3, minLng: 116.8, maxLng: 127.0 };

// Sabah (Malaysia) lies south-west of the islands. The Philippine islands at these latitudes start east of 119.3.
const SABAH_CUT = { maxLat: 7.5, maxLng: 119.3 };

export function inPhilippines(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < PH_BOUNDS.minLat || lat > PH_BOUNDS.maxLat || lng < PH_BOUNDS.minLng || lng > PH_BOUNDS.maxLng) return false;
  if (lat < SABAH_CUT.maxLat && lng < SABAH_CUT.maxLng) return false;
  return true;
}

export const OUTSIDE_PH_MESSAGE = 'Pins must be inside the Philippines.';
