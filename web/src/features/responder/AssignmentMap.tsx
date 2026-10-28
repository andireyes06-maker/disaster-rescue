import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoPoint, Report } from '../../types/domain';
import { PRIORITIES } from '../../types/domain';
import MapTileNotice, { useMapTiles } from '../../components/MapTileNotice';
import MapViewport from '../../components/MapViewport';
import EmptyState from '../../components/calm/EmptyState';
import { disasterSymbolHtml } from '../map/disasterSymbols';
import { markerStyle } from '../map/markerStyle';
import { typeLabel } from '../../lib/reportTypes';
import TypeLegend from '../map/TypeLegend';

export const validPoint = (p: GeoPoint | null | undefined): p is GeoPoint => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
export const directionsUrl = (p: GeoPoint) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
function Bounds({ points, focus, revision }: { points: GeoPoint[]; focus?: GeoPoint; revision: number }) {
  const map = useMap();
  const key = points.map(p => `${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    if (focus) map.setView([focus.lat, focus.lng], 15, { animate: false });
    else if (points.length) map.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 15, animate: false });
  }, [map, key, focus?.lat, focus?.lng, revision]);
  return null;
}
export function assignmentPinLabel(report: Report): string {
  return `Open ${report.reference || report.id}: ${typeLabel(report.type, report.typeDetail)} report, ${report.priority}, ${report.status}`;
}
function icon(report: Report) {
  const { shape, color, label } = markerStyle(report);
  return L.divIcon({ className: 'map-marker-wrap', iconSize: [44, 44], iconAnchor: [22, 22], html: `<span class="incident-pin">${disasterSymbolHtml(report.type)}<span class="map-marker map-marker--${shape}" style="--marker-color:${color}"></span></span><span class="map-marker__label">${label}</span>` });
}
function AssignmentMarker({ report, onSelect }: { report: Report; onSelect?: (report: Report) => void }) {
  const marker = useRef<L.Marker>(null);
  const label = assignmentPinLabel(report);
  useEffect(() => {
    const element = marker.current?.getElement();
    if (onSelect) element?.setAttribute('aria-label', label);
    else element?.removeAttribute('aria-label');
  }, [label, onSelect]);
  return <Marker ref={marker} position={[report.location!.lat, report.location!.lng]}
    interactive={!!onSelect} keyboard={!!onSelect}
    title={`${report.reference || typeLabel(report.type, report.typeDetail)} · ${report.priority} · ${report.status}`} icon={icon(report)}
    eventHandlers={{
      add: event => { if (onSelect) (event.target as L.Marker).getElement()?.setAttribute('aria-label', label); },
      click: () => onSelect?.(report),
      keydown: event => {
        if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') {
          event.originalEvent.preventDefault();
          if (!event.originalEvent.repeat) onSelect?.(report);
        }
      },
    }} />;
}
export function AssignmentMap({ reports, hq, selected, onSelect }: { reports: Report[]; hq?: GeoPoint | null; selected?: Report; onSelect?: (report: Report) => void }) {
  const located = reports.filter(r => validPoint(r.location));
  const headquarters = validPoint(hq) ? hq : null;
  const points = [...located.map(r => r.location!), ...(headquarters ? [headquarters] : [])];
  const tiles = useMapTiles();
  const [frame, setFrame] = useState({ all: false, revision: 0 });
  useEffect(() => { setFrame(f => ({ all: false, revision: f.revision + 1 })); }, [selected?.id]);
  if (!points.length) return <EmptyState title="No map locations available" body="Reports without a valid pin remain available in the assignment list." />;
  return <div data-map-tile-surface>
    {tiles.failed && <MapTileNotice onRetry={tiles.retry} />}
    <div className="response-map-canvas" role="region" aria-label="Map of your team’s assignments">
      <MapContainer center={[points[0].lat, points[0].lng]} zoom={13} scrollWheelZoom={false}>
        <Bounds points={frame.all ? points : located.length ? located.map(r => r.location!) : points} focus={!frame.all && validPoint(selected?.location) ? selected.location : undefined} revision={frame.revision} /><MapViewport />
        <TileLayer key={tiles.key} url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' eventHandlers={tiles.events} />
        {headquarters && <Marker position={[headquarters.lat, headquarters.lng]} title="Your team headquarters" interactive={false} keyboard={false} icon={L.divIcon({ className: 'hq-pin', html: '<span>HQ</span>', iconSize: [36, 22], iconAnchor: [18, 22] })} />}
        {located.map(r => <AssignmentMarker key={r.id} report={r} onSelect={onSelect} />)}
      </MapContainer>
    </div>
    <div className="response-map-tools"><span>{frame.all ? 'Assignments and headquarters' : selected ? 'Selected incident' : 'Assigned incident locations'}</span><div>{selected && <button className="btn btn--ghost" type="button" onClick={() => setFrame(f => ({ all: false, revision: f.revision + 1 }))}>Focus incident</button>}<button className="btn btn--ghost" type="button" onClick={() => setFrame(f => ({ all: true, revision: f.revision + 1 }))}>Fit all locations</button></div></div>
    <details className="response-map-legend"><summary>Map symbols and priority</summary><TypeLegend /><div className="response-legend-types"><span><strong>HQ</strong> Your headquarters</span></div><div className="response-legend-types">{PRIORITIES.map(priority => { const { color, shape } = markerStyle({ priority } as Report); return <span key={priority}><i className={`map-marker map-marker--${shape}`} style={{ '--marker-color': color } as React.CSSProperties} />{priority}</span>; })}</div><p>The icon identifies the incident type. The colored shape identifies priority. Status is shown in the assignment list.</p></details>
  </div>;
}
