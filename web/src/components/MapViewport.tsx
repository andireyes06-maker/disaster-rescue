import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { GeoPoint } from '../types/domain';
// Leaflet needs a new measurement when a dialog/disclosure opens or its container resizes.
export default function MapViewport({ point }: { point?: GeoPoint | null }) {
  const map = useMap();
  useEffect(() => {
    const refresh = () => map.invalidateSize({ animate: false });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(refresh) : null;
    observer?.observe(map.getContainer());
    window.addEventListener('resize', refresh);
    const timer = window.setTimeout(refresh, 200);
    return () => { observer?.disconnect(); window.clearTimeout(timer); window.removeEventListener('resize', refresh); };
  }, [map]);
  useEffect(() => { if (point) map.panTo([point.lat, point.lng], { animate: false }); }, [map, point?.lat, point?.lng]);
  return null;
}
