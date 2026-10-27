import PlaceLabel from '../../components/PlaceLabel';
import MapViewport from '../../components/MapViewport';
import { DisasterSymbol, disasterSymbolHtml } from './disasterSymbols';
import { MapPin, X } from 'lucide-react';
import ReportWindow from '../../components/ReportWindow';
import { ConnectionNotice } from '../../components/ConnectionStatus';
import EmptyState from '../../components/calm/EmptyState';
import MapTileNotice, { useMapTiles } from '../../components/MapTileNotice';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import IncidentModal from './IncidentModal';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useReports } from '../reports/useReports';
import { markerStyle } from './markerStyle';
import { PRIORITIES, REPORT_STATUSES, REPORT_TYPES, type Report, type GeoPoint } from '../../types/domain';
import Banner from '../../components/calm/Banner';
import { Skeleton } from '../../components/calm/Skeleton';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

interface Filters {
  type: string;
  priority: string;
  status: string;
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}

function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  const id = `map-filter-${label.toLowerCase()}`;
  return (
    <div className="filter">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map((o) => <option key={o} value={o}>{cap(o)}</option>)}
      </select>
    </div>
  );
}

// Labels and shapes come from constants, never from report text.
function iconFor(report: Report): L.DivIcon {
  const { color, shape, label } = markerStyle(report);
  return L.divIcon({
    className: 'map-marker-wrap',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    html: `<span class="incident-pin">${disasterSymbolHtml(report.type)}<span class="map-marker map-marker--${shape}" style="--marker-color: ${color}"></span></span>`
      + `<span class="map-marker__label">${label}</span>`,
  });
}

const DEFAULT_CENTER: [number, number] = [14.5995, 120.9842];
function PinSelection({ onSelect }: { onSelect: (point: GeoPoint) => void }) {
  useMapEvents({ click: event => onSelect({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

function FitReports({ reports }: { reports: Report[] }) {
  const map = useMap();
  const coordinates = reports.map((r) => `${r.location!.lat},${r.location!.lng}`).join(';');
  useEffect(() => {
    if (!coordinates) return;
    const points = coordinates.split(';').map((point) => point.split(',').map(Number) as [number, number]);
    map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 14, animate: false });
  }, [map, coordinates]);
  return null;
}

export default function IncidentMap() {
  const tiles = useMapTiles();
  const { reports, loading, error, fromCache, retry, windowSize, loadMore } = useReports();
  const [selection, setSelection] = useState<{ point: GeoPoint; name?: string } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const closeModal = useCallback(() => setOpenId(null), []);
  const [filters, setFilters] = useState<Filters>({ type: '', priority: '', status: '' });
  const set = (key: keyof Filters) => (value: string) => setFilters((f) => ({ ...f, [key]: value }));

  const located = useMemo(
    () => reports.filter((r) => r.location && Number.isFinite(r.location.lat) && Number.isFinite(r.location.lng)),
    [reports],
  );
  const visible = located.filter((r) =>
    (!filters.type || r.type === filters.type)
    && (!filters.priority || r.priority === filters.priority)
    && (!filters.status || r.status === filters.status),
  );
  const center = located.length && located[0].location
    ? ([located[0].location.lat, located[0].location.lng] as [number, number])
    : DEFAULT_CENTER;

  if (error) {
    return (
      <Banner tone="error" role="alert">
        The map could not load reports. Try again later.{' '}
        <button className="btn btn--ghost" type="button" onClick={retry}>Try again</button>
      </Banner>
    );
  }
  if (loading) return <Skeleton label="Loading incident map"><div className="skeleton-map" /></Skeleton>;

  return (
    <div data-map-tile-surface className="incident-map-page">
      <ConnectionNotice fromCache={fromCache} />
      {!loading && !error && <ReportWindow count={reports.length} windowSize={windowSize} loadMore={loadMore} />}
      <div className="card map-filters" role="group" aria-label="Map filters">
        <FilterSelect label="Type" value={filters.type} onChange={set('type')} options={REPORT_TYPES} />
        <FilterSelect label="Priority" value={filters.priority} onChange={set('priority')} options={PRIORITIES} />
        <FilterSelect label="Status" value={filters.status} onChange={set('status')} options={REPORT_STATUSES} />
      </div>
      <section className="map-key" aria-label="Map legend">
        <header><strong>{visible.length} located report{visible.length === 1 ? '' : 's'} shown</strong><p>Disaster icons identify the incident. Colored shapes show priority. Open a report to see its response status.</p></header>
        <div className="map-key__group"><h2>Disaster type</h2><ul aria-label="Disaster type symbols">{REPORT_TYPES.map(type => <li key={type}><span className="incident-pin incident-pin--legend"><DisasterSymbol type={type} /></span>{cap(type)}</li>)}</ul></div>
        <div className="map-key__group"><h2>Priority</h2><ul aria-label="Priority colors and shapes">{PRIORITIES.map(priority => { const style = markerStyle({ priority }); return <li key={priority}><span className={`map-marker map-marker--${style.shape}`} style={{ '--marker-color': style.color } as CSSProperties} />{style.label}</li>; })}</ul></div>
      </section>
      {visible.length === 0 && (
        <EmptyState
          title={located.length ? 'No reports match these filters' : 'No located reports yet'}
          body={located.length ? 'Clear the filters to see all located reports.' : 'Reports appear here once they include a location.'}
          action={Object.values(filters).some(Boolean) && <button type="button" className="btn btn--ghost" onClick={() => setFilters({ type: '', priority: '', status: '' })}>Clear map filters</button>}
        />
      )}
      {tiles.failed && <MapTileNotice onRetry={tiles.retry} />}
      <div className="incident-map">
        <MapContainer center={center} zoom={located.length ? 13 : 11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <FitReports reports={visible} /><MapViewport point={selection?.point} /><PinSelection onSelect={point => setSelection({ point })} />
          {selection && <Marker position={[selection.point.lat, selection.point.lng]} interactive={false} keyboard={false} icon={L.divIcon({ className: 'selected-location-pin', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] })} />}
          <TileLayer
            key={tiles.key} eventHandlers={tiles.events}
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {visible.map((r) => (
            <Marker
              key={r.id}
              position={[r.location!.lat, r.location!.lng]}
              icon={iconFor(r)}
              title={`Report ${r.id}, ${cap(r.type)}, ${markerStyle(r).label}, ${r.status}`}
              eventHandlers={{
                click: () => { setSelection({ point: r.location!, name: r.placeName }); setOpenId(r.id); },
                keydown: (event) => {
                  const key = (event as L.LeafletKeyboardEvent).originalEvent;
                  if (key.key !== 'Enter' && key.key !== ' ') return;
                  L.DomEvent.stop(key);
                  setOpenId(r.id);
                },
              }}
            />
          ))}
        </MapContainer>
      </div>
      {selection && <aside className="map-place-inspector" aria-label="Selected map location"><MapPin size={23} aria-hidden="true" /><div><strong>Selected place</strong><PlaceLabel point={selection.point} saved={selection.name} /><small>Approximate address · © OpenStreetMap contributors</small><a href={`https://www.google.com/maps/search/?api=1&query=${selection.point.lat},${selection.point.lng}`} target="_blank" rel="noopener noreferrer">Open in Google Maps</a></div><button type="button" className="btn btn--ghost" aria-label="Clear selected location" onClick={() => setSelection(null)}><X size={17} aria-hidden="true" /></button></aside>}
      {openId && <IncidentModal reportId={openId} onClose={closeModal} />}
    </div>
  );
}
