import { useEffect } from 'react';
import MapTileNotice, { useMapTiles } from '../../components/MapTileNotice';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Point { lat: number; lng: number }
function LocationControl({ value, onChange }: { value: Point | null; onChange: (point: Point) => void }) {
  const map = useMap();
  useMapEvents({ click: (event) => onChange(event.latlng) });
  useEffect(() => { if (value) map.setView([value.lat, value.lng], Math.max(map.getZoom(), 14), { animate: false }); }, [map, value]);
  return value ? <CircleMarker center={[value.lat, value.lng]} radius={9} pathOptions={{ color: '#6D28D9', fillColor: '#6D28D9', fillOpacity: 0.8 }} /> : null;
}

export default function ReportLocationMap({ value, onChange }: { value: Point | null; onChange: (point: Point) => void }) {
  const tiles = useMapTiles();
  return <div data-map-tile-surface className="report-location-map" aria-label="Choose the incident location on the map">
    {tiles.failed && <MapTileNotice onRetry={tiles.retry} />}
    <MapContainer center={value ? [value.lat, value.lng] : [14.8527, 120.816]} zoom={12} scrollWheelZoom={false} style={{ height: 280, width: '100%' }}>
      <TileLayer key={tiles.key} eventHandlers={tiles.events} attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationControl value={value} onChange={onChange} />
    </MapContainer>
  </div>;
}
