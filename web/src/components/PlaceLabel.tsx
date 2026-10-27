import type { GeoPoint } from '../types/domain';
import { usePlaceName } from '../lib/usePlaceName';
export default function PlaceLabel({ point, saved }: { point?: GeoPoint | null; saved?: string | null }) {
  const place = usePlaceName(point, saved);
  return <span className="place-label"><span>{place.name || (place.loading ? 'Finding selected place…' : place.coordinates ? 'Pinned location' : 'Location not provided')}</span>{place.coordinates && <small>{place.coordinates}</small>}{place.coordinates && !place.loading && !place.name && <small>Address unavailable. The pin is still set.</small>}</span>;
}
