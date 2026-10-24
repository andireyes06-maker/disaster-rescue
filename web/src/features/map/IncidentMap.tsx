import ReportWindow from '../../components/ReportWindow';
import { ConnectionNotice } from '../../components/ConnectionStatus';
import EmptyState from '../../components/calm/EmptyState';
import MapTileNotice, { useMapTiles } from '../../components/MapTileNotice';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useReports } from '../reports/useReports';
import { markerStyle } from './markerStyle';
import { PRIORITIES, REPORT_STATUSES, REPORT_TYPES, type Report } from '../../types/domain';
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
    html: `<span class="map-marker map-marker--${shape}" style="--marker-color: ${color}"></span>`
      + `<span class="map-marker__label">${label}</span>`,
  });
}

const DEFAULT_CENTER: [number, number] = [0, 0];

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
  const navigate = useNavigate();
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
      <div className="map-legend" role="group" aria-label="Map legend">
        <strong>{visible.length} located report{visible.length === 1 ? '' : 's'} shown</strong>
        <ul className="map-legend__priorities" aria-label="Priority colors">
          {PRIORITIES.map((priority) => <li key={priority}><span className={`badge badge--${priority}`}>{cap(priority)}</span></li>)}
        </ul>
      </div>
      {visible.length === 0 && (
        <EmptyState
          title={located.length ? 'No reports match these filters' : 'No located reports yet'}
          body={located.length ? 'Clear the filters to see all located reports.' : 'Reports appear here once they include a location.'}
          action={Object.values(filters).some(Boolean) && <button type="button" className="btn btn--ghost" onClick={() => setFilters({ type: '', priority: '', status: '' })}>Clear map filters</button>}
        />
      )}
      {tiles.failed && <MapTileNotice onRetry={tiles.retry} />}
      <div className="incident-map">
        <MapContainer center={center} zoom={located.length ? 13 : 2} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <FitReports reports={visible} />
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
                click: () => navigate(`/incidents/${r.id}`),
                keydown: (event) => {
                  const key = (event as L.LeafletKeyboardEvent).originalEvent;
                  if (key.key !== 'Enter' && key.key !== ' ') return;
                  L.DomEvent.stop(key);
                  navigate(`/incidents/${r.id}`);
                },
              }}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
