import { useMemo, useState } from 'react';
import Banner from './calm/Banner';

export function useMapTiles() {
  const [failed, setFailed] = useState(false);
  const [key, setKey] = useState(0);
  const events = useMemo(() => ({ tileerror: () => setFailed(true) }), []);
  const retry = () => { setFailed(false); setKey(value => value + 1); };
  return { failed, key, events, retry };
}

export default function MapTileNotice({ onRetry }: { onRetry: () => void }) {
  return <Banner tone="error" role="alert">Some map tiles could not load. Check your connection or retry the map background. <button type="button" className="btn btn--ghost" onClick={event => { const map = event.currentTarget.closest('[data-map-tile-surface]')?.querySelector<HTMLElement>('.leaflet-container'); onRetry(); map?.focus(); }}>Retry map background</button></Banner>;
}
