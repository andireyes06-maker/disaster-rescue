import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { makeReport } from '../reports/fixtures';
import type { Report } from '../../types/domain';

const h = vi.hoisted(() => ({ mapEvents: {} as { click?: (event: { latlng: { lat: number; lng: number } }) => void }, reports: [] as Report[], loading: false, error: null as Error | null, retry: vi.fn() }));
vi.mock('../reports/useReports', () => ({
  useReports: () => ({ reports: h.reports, loading: h.loading, error: h.error, retry: h.retry }),
}));
vi.mock('../../components/MapViewport', () => ({ default: () => null }));
vi.mock('../../lib/placeName', () => ({ approximatePlaceName: async () => 'Test District, Test City' }));
vi.mock('react-leaflet', () => ({
  useMapEvents: (events: typeof h.mapEvents) => { h.mapEvents = events; },
  useMap: () => ({ fitBounds: vi.fn() }),
  MapContainer: ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ eventHandlers, title }: { eventHandlers?: { click?: () => void; keydown?: (event: { originalEvent: KeyboardEvent }) => void }; title?: string }) => (
    <button type="button" aria-label={title} onClick={() => eventHandlers?.click?.()} onKeyDown={(event) => eventHandlers?.keydown?.({ originalEvent: event.nativeEvent })} />
  ),
}));
vi.mock('../reports/IncidentDetails', () => ({ default: ({ reportId }: { reportId?: string }) => <p>Details for {reportId}</p> }));
import IncidentMap from './IncidentMap';

function renderMap(reports: Report[]) {
  h.reports = reports;
  return render(
    <MemoryRouter initialEntries={['/map']}>
      <Routes>
        <Route path="/map" element={<IncidentMap />} />
        <Route path="/incidents/:id" element={<p>Incident page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('IncidentMap', () => {
  beforeEach(() => { h.reports = []; h.loading = false; h.error = null; h.retry.mockReset(); });

  it('explains the same disaster symbols and priority shapes used on the map', () => {
    renderMap([makeReport()]);
    expect(screen.getByRole('list', { name: 'Emergency types' }).querySelectorAll('svg')).toHaveLength(8);
    expect(screen.getByRole('list', { name: 'Priority colors and shapes' }).querySelector('.map-marker--triangle')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Priority colors and shapes' }).querySelector('.map-marker--diamond')).toBeInTheDocument();
  });

  it('names a selected map point and lets the user clear it', async () => {
    renderMap([makeReport()]);
    act(() => h.mapEvents.click?.({ latlng: { lat: 14.55123, lng: 121.01234 } }));
    expect(await screen.findByText('Test District, Test City')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in Google Maps' })).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=14.55123,121.01234');
    await userEvent.click(screen.getByRole('button', { name: 'Clear selected location' }));
    expect(screen.queryByRole('complementary', { name: 'Selected map location' })).toBeNull();
  });

  it('shows an empty state when no located reports exist', () => {
    renderMap([makeReport({ id: 'r1', location: undefined })]);
    expect(screen.getByRole('heading', { name: 'No located reports yet' })).toBeInTheDocument();
  });

  it('names a marker and the Type filter by label, never by the key', () => {
    renderMap([makeReport({ id: 'r1', type: 'road_hazard' }), makeReport({ id: 'r2', type: 'other', typeDetail: 'gas leak' })]);
    expect(screen.getByRole('button', { name: /Report r1, Roadblock,/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Report r2, Other: gas leak,/ })).toBeInTheDocument();
    const options = within(screen.getByLabelText('Type')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['All', 'Flood', 'Fire', 'Earthquake', 'Landslide', 'Lifeline', 'Roadblock', 'Live Wire', 'Other']);
  });

  it('hides markers whose status does not match the filter', async () => {
    const user = userEvent.setup();
    renderMap([
      makeReport({ id: 'r1', status: 'Submitted' }),
      makeReport({ id: 'r2', status: 'Verified', verified: true }),
    ]);
    expect(screen.getByRole('button', { name: /Report r1,/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Report r2,/ })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Status'), 'Verified');
    expect(screen.queryByRole('button', { name: /Report r1,/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Report r2,/ })).toBeInTheDocument();
  });

  it('opens the incident in a dialog over the map when a marker is clicked', async () => {
    const user = userEvent.setup();
    renderMap([makeReport({ id: 'r1' })]);
    await user.click(screen.getByRole('button', { name: /Report r1,/ }));
    expect(screen.getByRole('dialog', { name: 'Incident details' })).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open full report' })).toHaveAttribute('href', '/incidents/r1');
    expect(screen.getByText('Details for r1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close incident details' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('shows a map skeleton while loading and no empty state', () => {
    h.loading = true; renderMap([]);
    expect(screen.getByRole('status')).toHaveTextContent('Loading incident map');
    expect(screen.queryByText('No located reports yet')).not.toBeInTheDocument();
  });
  it('offers retry after an error', async () => {
    h.error = new Error('offline'); renderMap([]);
    expect(screen.getByRole('alert')).toHaveTextContent('The map could not load reports');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(h.retry).toHaveBeenCalledTimes(1);
  });
  it('clears map filters when located reports are filtered out', async () => {
    renderMap([makeReport({ id: 'r1', type: 'flood' })]);
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'fire');
    expect(screen.getByText('No reports match these filters')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear map filters' }));
    expect(screen.getByRole('button', { name: /Report r1,/ })).toBeInTheDocument();
  });

  it.each(['Enter', ' '])('opens an incident when a focused marker receives %s', (key) => {
    renderMap([makeReport({ id: 'r1' })]);
    const marker = screen.getByRole('button', { name: /Report r1,/ });
    marker.focus();
    fireEvent.keyDown(marker, { key });
    expect(screen.getByRole('dialog', { name: 'Incident details' })).toBeInTheDocument();
  });

});
