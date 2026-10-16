import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../../api/client';
import EmptyState from '../../components/calm/EmptyState';
import { Skeleton } from '../../components/calm/Skeleton';
import Banner from '../../components/calm/Banner';

export interface PublicIncident {
  type: string;
  statusCategory: 'open' | 'responding' | 'resolved';
  center: { lat: number; lng: number };
  radiusMeters: number;
}

interface MapState {
  incidents: PublicIncident[] | null;
  error: 'busy' | 'failed' | null;
  loading: boolean;
}

// Rounded areas only. The endpoint never returns an exact point, address, reporter, or photo.
export default function PublicIncidentMap() {
  const [state, setState] = useState<MapState>({ incidents: null, error: null, loading: true });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api('/public/incidents')
      .then((res) => {
        if (!cancelled) setState({ incidents: (res as { incidents: PublicIncident[] }).incidents, error: null, loading: false });
      })
      .catch((err) => {
        if (cancelled) return;
        const busy = (err as { status?: number }).status === 429;
        setState({ incidents: null, error: busy ? 'busy' : 'failed', loading: false });
      });
    return () => { cancelled = true; };
  }, [attempt]);

  const retry = () => setAttempt((n) => n + 1);

  // Reserve the map's final height while loading, so the page does not jump when the map arrives (W06).
  if (state.loading) return <Skeleton label="Loading the map"><div className="skeleton-map" /></Skeleton>;
  if (state.error) {
    return (
      <Banner tone="error" role="alert">
        {state.error === 'busy' ? 'The map is busy. Try again in a minute.' : 'Could not load the map.'}{' '}
        <button type="button" className="btn btn--ghost" onClick={retry}>Try again</button>
      </Banner>
    );
  }
  const incidents = state.incidents ?? [];
  if (incidents.length === 0) {
    return <EmptyState title="No open incidents in this area right now." body="This map shows rounded areas, not exact addresses." />;
  }

  const first = incidents[0].center;
  return (
    <div className="public-map" aria-label="Incident areas (rounded)">
      <MapContainer center={[first.lat, first.lng]} zoom={12} scrollWheelZoom={false} style={{ height: 320, width: '100%' }}>
        <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {incidents.map((i, n) => (
          <Circle
            key={`${i.center.lat}-${i.center.lng}-${n}`}
            center={[i.center.lat, i.center.lng]}
            radius={i.radiusMeters}
            pathOptions={{ className: `public-circle public-circle--${i.statusCategory}` }}
          />
        ))}
      </MapContainer>
    </div>
  );
}
