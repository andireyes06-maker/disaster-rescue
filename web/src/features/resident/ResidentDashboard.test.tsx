import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { makeReport } from '../reports/fixtures';

const h = vi.hoisted(() => ({
  reports: { reports: [] as unknown[], loading: false, error: null, retry: vi.fn() },
  hotlines: { numbers: [{ label: 'National Emergency Hotline', number: '911' }], residentNotice: '' },
}));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { uid: 'res-1', email: 'ana@example.com' }, role: 'resident' }) }));
vi.mock('./useMyReports', () => ({ useMyReports: () => h.reports }));
vi.mock('./useHotlines', () => ({ useHotlines: () => h.hotlines }));
vi.mock('./PublicIncidentMap', () => ({ default: () => <p>public map</p> }));

import ResidentDashboard from './ResidentDashboard';

function renderPage() {
  return render(<MemoryRouter><ResidentDashboard /></MemoryRouter>);
}

describe('ResidentDashboard', () => {
  beforeEach(() => {
    h.reports = { reports: [], loading: false, error: null, retry: vi.fn() };
    h.hotlines = { numbers: [{ label: 'National Emergency Hotline', number: '911' }], residentNotice: '' };
  });

  it('shows the safety notice and hotline first', () => {
    renderPage();
    expect(screen.getByText(/does not guarantee immediate rescue/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '911' })).toHaveAttribute('href', 'tel:911');
  });

  it('links the report button to the report form', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Report an emergency' })).toHaveAttribute('href', '/my/report');
  });

  it('lists each report with its status and links to its detail', () => {
    h.reports.reports = [makeReport({ id: 'r1', type: 'flood', status: 'Verified' } as never)];
    renderPage();
    const row = screen.getByRole('link', { name: /Flood/ });
    expect(row).toHaveAttribute('href', '/my/reports/r1');
    expect(within(row).getByText('Verified')).toBeInTheDocument();
  });

  it('says so when there are no reports yet', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'No reports yet' })).toBeInTheDocument();
  });

  it('shows the public map of rounded areas', () => {
    renderPage();
    expect(screen.getByText('public map')).toBeInTheDocument();
  });

  it('keeps notifications out of the dashboard content', () => {
    renderPage();
    expect(screen.queryByRole('heading', { name: 'Notifications' })).not.toBeInTheDocument();
  });
});
