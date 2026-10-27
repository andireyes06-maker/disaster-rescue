import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// jsdom has no geolocation. The API checks reach, so tests supply a fixed position inside the incident's reach.
vi.mock('../../lib/position', () => ({ currentPosition: () => Promise.resolve({ lat: 14.8512, lng: 120.8123 }) }));
import userEvent from '@testing-library/user-event';

const state = vi.hoisted(() => ({
  team: 'team-a' as string | null,
  reports: [] as unknown[],
  closed: [] as unknown[],
  ackAt: null as Date | null,
  ackLoading: false,
  ackError: false,
  // The report behind a draft (useReport). Tests set it per case.
  draftReport: { report: null, loading: false, error: null, notFound: false, removed: false, fromCache: false } as Record<string, unknown>,
  api: vi.fn(),
}));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ team: state.team }) }));
vi.mock('./useAssignedReports', () => ({
  useAssignedReports: () => ({ reports: state.reports, loading: false, error: null }),
}));
vi.mock('./useClosedTeamReports', () => ({
  useClosedTeamReports: () => ({ reports: state.closed, loading: false, error: null, fromCache: false, retry: () => {} }),
}));

vi.mock('../reports/useReport', () => ({
  useAcknowledgedAt: () => ({ at: state.ackAt, acknowledged: !!state.ackAt, loading: state.ackLoading, error: state.ackError ? new Error('unavailable') : null }),
  useReportUpdates: () => ({ updates: [], error: null, loading: false, hasMore: false, retry: () => {}, loadOlder: () => {} }),
  useReport: () => ({ ...state.draftReport, retry: () => {} }),
}));
// The team summary card loads its own counts; keep those out of the call sequence these tests assert.
vi.mock('../../api/client', async (original) => ({ ...await original<typeof import('../../api/client')>(), api: (...a: unknown[]) => (a[0] === '/stats/team' ? Promise.resolve(null) : state.api(...a)) }));

import AssignmentsPage from './AssignmentsPage';

const renderPage = () => render(<MemoryRouter><AssignmentsPage /></MemoryRouter>);

describe('AssignmentsPage empty states', () => {
  beforeEach(() => {
    state.team = 'team-a';
    state.reports = [];
  });

  it('explains when the account has no rescue team', () => {
    state.team = null;
    renderPage();
    expect(screen.getByRole('heading', { name: 'Your account is not linked to a rescue team' })).toBeInTheDocument();
  });

  it('says so when the team has no open assignments', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'No open assignments right now' })).toBeInTheDocument();
  });
});

describe('AssignmentsPage acknowledgement', () => {
  const report = {
    id: 'r1', type: 'flood', status: 'Team Assigned', priority: 'critical', description: 'Water on the ground floor.',
    addressText: 'Riverside District', location: null, createdAt: new Date('2026-10-12T10:00:00Z'),
  };
  beforeEach(() => {
    state.team = 'team-a';
    state.reports = [report];
    state.ackAt = null;
    state.ackLoading = false;
    state.ackError = false;
    state.api.mockReset().mockResolvedValue({});
  });

  it('offers Acknowledge until a responder has acknowledged', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
  });

  it('shows the acknowledgement time and no button once acknowledged', () => {
    state.ackAt = new Date('2026-10-17T10:00:00Z');
    renderPage();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(screen.getByText(/Acknowledged/)).toBeInTheDocument();
  });

  it('does not offer another acknowledgement before its history loads', () => {
    state.ackLoading = true;
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Checking acknowledgement');
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
  });

  it('does not treat failed history reads as an unacknowledged assignment', () => {
    state.ackError = true;
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not check acknowledgement');
    expect(screen.getByRole('button', { name: 'Reload assignments' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
  });

  it('keeps the confirmed acknowledgement when its stream has not caught up', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(await screen.findByText('Acknowledged')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(state.api).toHaveBeenCalledTimes(1);
  });
});

describe('AssignmentsPage recently closed (read-only, bounded)', () => {
  const closedReport = (n: number) => ({
    id: `c${n}`, type: 'fire', status: 'Closed', priority: 'high', description: `Closed case ${n}.`,
    addressText: 'Harbour Road', location: null, verified: true, classification: '', photos: [], possibleDuplicates: [],
    createdAt: new Date(Date.UTC(2026, 9, 1, n)), updatedAt: new Date(Date.UTC(2026, 9, 1, n)),
  });
  beforeEach(() => {
    state.team = 'team-a';
    state.reports = [];
    state.closed = [];
    state.ackAt = null;
    state.ackLoading = false;
    state.ackError = false;
  });

  it('shows no closed section when the team has none', () => {
    renderPage();
    expect(screen.queryByRole('heading', { name: 'Recently closed' })).not.toBeInTheDocument();
  });

  it('lists at most the 10 most recent closed reports and says so when truncated', () => {
    state.closed = Array.from({ length: 12 }, (_, i) => closedReport(i + 1));
    renderPage();
    const section = screen.getByRole('region', { name: 'Recently closed' });
    expect(section.querySelectorAll('li')).toHaveLength(10);
    expect(section).toHaveTextContent('Showing the 10 most recent');
  });

  it('does not say the list is truncated when every closed report fits', () => {
    state.closed = [closedReport(1), closedReport(2)];
    renderPage();
    const section = screen.getByRole('region', { name: 'Recently closed' });
    expect(section.querySelectorAll('li')).toHaveLength(2);
    expect(section).not.toHaveTextContent('Showing the 10 most recent');
  });

  it('gives closed reports no operational controls', () => {
    state.closed = [closedReport(1)];
    renderPage();
    const section = screen.getByRole('region', { name: 'Recently closed' });
    expect(section.querySelectorAll('button')).toHaveLength(0);
    expect(section.querySelectorAll('form, input, textarea, select')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Post an update' })).not.toBeInTheDocument();
  });

  it('links each closed report to its read-only detail route', () => {
    state.closed = [closedReport(3)];
    renderPage();
    expect(screen.getByRole('link', { name: 'View fire report' })).toHaveAttribute('href', '/assignments/c3');
  });
});

describe('AssignmentsPage title and order', () => {
  beforeEach(() => {
    state.team = 'team-a';
    state.reports = [];
    document.title = 'I-Report';
  });

  it('sets the Assignments document title on first render', () => {
    renderPage();
    expect(document.title).toBe('Assignments · I-Report');
  });

  it('labels the assignment list as oldest first, in the order the hook returns it', () => {
    const at = new Date('2026-10-19T09:00:00+08:00');
    state.reports = [
      { id: 'old', type: 'flood', status: 'Team Assigned', assignedTeamId: 'team-a', reference: 'RR-1', description: '', location: null, addressText: '', priority: 'High', createdAt: at, updatedAt: at },
      { id: 'new', type: 'fire', status: 'Team Assigned', assignedTeamId: 'team-a', reference: 'RR-2', description: '', location: null, addressText: '', priority: 'High', createdAt: new Date(at.getTime() + 3600000), updatedAt: at },
    ];
    renderPage();
    const list = screen.getByRole('list', { name: 'Assigned incidents, oldest first' });
    const items = within(list).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('flood report');
    expect(items[1]).toHaveTextContent('fire report');
  });
});
