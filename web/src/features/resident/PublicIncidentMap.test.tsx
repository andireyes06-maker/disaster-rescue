import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', () => ({ api: h.api }));
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Circle: ({ radius, pathOptions }: { radius: number; pathOptions?: { className?: string } }) => (
    <span data-testid="circle" data-radius={radius} data-class={pathOptions?.className} />
  ),
}));

import PublicIncidentMap from './PublicIncidentMap';

describe('PublicIncidentMap', () => {
  beforeEach(() => {
    h.api.mockReset();
  });

  it('draws one rounded circle per incident, 500 m across the rounded centre', async () => {
    h.api.mockResolvedValue({ incidents: [
      { type: 'flood', statusCategory: 'open', center: { lat: 14.6, lng: 121.0 }, radiusMeters: 500 },
      { type: 'fire', statusCategory: 'responding', center: { lat: 14.61, lng: 121.01 }, radiusMeters: 500 },
    ] });
    render(<PublicIncidentMap />);
    const circles = await screen.findAllByTestId('circle');
    expect(circles).toHaveLength(2);
    expect(circles[0]).toHaveAttribute('data-radius', '500');
    expect(circles[0]).toHaveAttribute('data-class', expect.stringContaining('public-circle--open'));
    expect(circles[1]).toHaveAttribute('data-class', expect.stringContaining('public-circle--responding'));
  });

  it('says so when there are no open incidents (review focus 4)', async () => {
    h.api.mockResolvedValue({ incidents: [] });
    render(<PublicIncidentMap />);
    expect(await screen.findByText('No open incidents in this area right now.')).toBeInTheDocument();
    expect(screen.queryByTestId('circle')).toBeNull();
  });

  it('asks the visitor to wait when the endpoint rate-limits them (review focus 5)', async () => {
    h.api.mockRejectedValueOnce(Object.assign(new Error('rate_limited'), { status: 429, code: 'rate_limited' }));
    const user = userEvent.setup();
    render(<PublicIncidentMap />);
    expect(await screen.findByText('The map is busy. Try again in a minute.')).toBeInTheDocument();
    h.api.mockResolvedValueOnce({ incidents: [] });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No open incidents in this area right now.')).toBeInTheDocument();
  });
});
