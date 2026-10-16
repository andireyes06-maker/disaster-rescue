import EmptyState from '../../components/calm/EmptyState';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useReports } from '../reports/useReports';
import { markerStyle } from './markerStyle';
import { PRIORITIES, REPORT_STATUSES, REPORT_TYPES, type Report } from '../../types/domain';

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
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<span class="map-marker map-marker--${shape}" style="--marker-color: ${color}"></span>`
      + `<span class="map-marker__label">${label}</span>`,
  });
}

const DEFAULT_CENTER: [number, number] = [0, 0];

export default function IncidentMap() {
  const { reports, loading, error } = useReports();
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

  if (error) return <p role="alert" className="error">The map could not load reports. Try again later.</p>;
  if (loading) return <p role="status" className="loading">Loading...</p>;

  return (
    <div className="incident-map-page">
      <div className="card map-filters" role="group" aria-label="Map filters">
        <FilterSelect label="Type" value={filters.type} onChange={set('type')} options={REPORT_TYPES} />
        <FilterSelect label="Priority" value={filters.priority} onChange={set('priority')} options={PRIORITIES} />
        <FilterSelect label="Status" value={filters.status} onChange={set('status')} options={REPORT_STATUSES} />
      </div>
      <p>{visible.length} located report{visible.length === 1 ? '' : 's'} shown.</p>
      {visible.length === 0 && (
        <EmptyState
          title="No located reports yet"
          body="Reports appear here once they include a location. Clear the filters to see all located reports."
        />
      )}
      <div className="incident-map">
        <MapContainer center={center} zoom={located.length ? 13 : 2} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {visible.map((r) => (
            <Marker
              key={r.id}
              position={[r.location!.lat, r.location!.lng]}
              icon={iconFor(r)}
              title={`Report ${r.id}, ${cap(r.type)}, ${markerStyle(r).label}, ${r.status}`}
              eventHandlers={{ click: () => navigate(`/incidents/${r.id}`) }}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
