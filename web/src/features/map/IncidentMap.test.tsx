import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { makeReport } from '../reports/fixtures';
import type { Report } from '../../types/domain';

const h = vi.hoisted(() => ({ reports: [] as Report[] }));
vi.mock('../reports/useReports', () => ({
  useReports: () => ({ reports: h.reports, loading: false, error: null }),
}));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ eventHandlers, title }: { eventHandlers?: { click?: () => void }; title?: string }) => (
    <button type="button" aria-label={title} onClick={() => eventHandlers?.click?.()} />
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
  beforeEach(() => { h.reports = []; });

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
});
