import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { makeReport } from '../reports/fixtures';
import type { Report } from '../../types/domain';

const h = vi.hoisted(() => ({ reports: [] as Report[], loading: false, error: null as Error | null, retry: vi.fn() }));
vi.mock('../reports/useReports', () => ({
  useReports: () => ({ reports: h.reports, loading: h.loading, error: h.error, retry: h.retry }),
}));
vi.mock('react-leaflet', () => ({
  useMap: () => ({ fitBounds: vi.fn() }),
  MapContainer: ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ eventHandlers, title }: { eventHandlers?: { click?: () => void; keydown?: (event: { originalEvent: KeyboardEvent }) => void }; title?: string }) => (
    <button type="button" aria-label={title} onClick={() => eventHandlers?.click?.()} onKeyDown={(event) => eventHandlers?.keydown?.({ originalEvent: event.nativeEvent })} />
  ),
}));
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

  it('shows an empty state when no located reports exist', () => {
    renderMap([makeReport({ id: 'r1', location: undefined })]);
    expect(screen.getByRole('heading', { name: 'No located reports yet' })).toBeInTheDocument();
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

  it('navigates to the incident route when a marker is clicked', async () => {
    const user = userEvent.setup();
    renderMap([makeReport({ id: 'r1' })]);
    await user.click(screen.getByRole('button', { name: /Report r1,/ }));
    expect(screen.getByText('Incident page')).toBeInTheDocument();
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
    expect(screen.getByText('Incident page')).toBeInTheDocument();
  });

});
