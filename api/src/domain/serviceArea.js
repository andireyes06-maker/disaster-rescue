// The app only takes pins inside the Philippines. This is an approximate box, not a border.
// It is wide enough for every island group, from Batanes to Tawi-Tawi and east to Davao Oriental.
export const PH_BOUNDS = { minLat: 4.5, maxLat: 21.3, minLng: 116.8, maxLng: 127.0 };

// Sabah (Malaysia) lies south-west and south of the Philippine islands. Two cuts keep it out:
// south of 6.0 degrees north and west of 119.3 (Sabah's east coast, Semporna), and north of 6.0 but west of 118.0
// (Sabah's north-west and Kudat). The Turtle Islands (about 6.08N, 118.32E) fall outside both cuts.
const SABAH_CUTS = [{ maxLat: 6.0, maxLng: 119.3 }, { maxLat: 7.5, maxLng: 118.0 }];

export function inPhilippines(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < PH_BOUNDS.minLat || lat > PH_BOUNDS.maxLat || lng < PH_BOUNDS.minLng || lng > PH_BOUNDS.maxLng) return false;
  for (const cut of SABAH_CUTS) if (lat < cut.maxLat && lng < cut.maxLng) return false;
  return true;
}

export const OUTSIDE_PH_MESSAGE = 'Pins must be inside the Philippines.';
