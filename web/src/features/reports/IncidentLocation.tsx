import MapTileNotice, { useMapTiles } from '../../components/MapTileNotice';
import { Circle, CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import { ExternalLink, MapPin } from 'lucide-react';
import type { GeoPoint } from '../../types/domain';
import 'leaflet/dist/leaflet.css';
import PlaceLabel from '../../components/PlaceLabel';
import MapViewport from '../../components/MapViewport';

export default function IncidentLocation({ location, name, radius = 500 }: { location: GeoPoint; name: string; radius?: number }) {
  const tiles = useMapTiles();
  const center: [number, number] = [location.lat, location.lng];
  return <section data-map-tile-surface className="incident-location" aria-label="Incident location">
    <header><div><MapPin size={19} aria-hidden="true" /><h2>Reported location</h2></div><a href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`} target="_blank" rel="noopener noreferrer">Open in maps<ExternalLink size={14} aria-hidden="true" /></a></header>
    {tiles.failed && <MapTileNotice onRetry={tiles.retry} />}
    <div className="incident-location__map">
      <MapContainer center={center} zoom={14} scrollWheelZoom={false} attributionControl zoomControl>
        <MapViewport point={location} /><TileLayer key={tiles.key} eventHandlers={tiles.events} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <Circle center={center} radius={radius} pathOptions={{ color: '#6D28D9', fillColor: '#6D28D9', fillOpacity: 0.09, weight: 1.5 }} />
        <CircleMarker center={center} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#6D28D9', fillOpacity: 1 }} />
      </MapContainer>
    </div>
    <footer><strong><PlaceLabel point={location} saved={name} /></strong><span>Reported reach: {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}</span><small>The shaded area shows the reported reach, not a verified hazard boundary.</small></footer>
  </section>;
}
