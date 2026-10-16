import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { makeReport } from '../reports/fixtures';

vi.mock('../reports/useReports', () => ({
  useReports: () => ({
    reports: [makeReport({ id: 'r1', status: 'Submitted' }), makeReport({ id: 'r2', status: 'Verified', verified: true })],
    loading: false,
    error: null,
  }),
}));
vi.mock('react-leaflet', () => ({
  useMap: () => ({ fitBounds: vi.fn() }),
  MapContainer: ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ title }: { title?: string }) => <button type="button" aria-label={title} />,
}));
import MonitorPage from './MonitorPage';

const ACTION = /^(assign|acknowledge|close|reject|save|verify|classify|set priority|mark|confirm)/i;

describe('MonitorPage', () => {
  it('renders no action buttons for dmo', () => {
    render(<MemoryRouter><MonitorPage /></MemoryRouter>);
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: ACTION })).toHaveLength(0);
  });
});
