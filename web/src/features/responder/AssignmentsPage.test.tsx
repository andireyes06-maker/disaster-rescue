import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// jsdom has no geolocation. The API checks reach, so tests supply a fixed position inside the incident's reach.
vi.mock('../../lib/position', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/position')>()), currentPosition: () => state.position() }));
import userEvent from '@testing-library/user-event';

const state = vi.hoisted(() => ({
  team: 'team-a' as string | null,
  position: vi.fn(() => Promise.resolve({ lat: 14.8512, lng: 120.8123 })),
  reports: [] as unknown[],
  closed: [] as unknown[],
  closedError: null as Error | null,
  partialError: null as Error | null,
  ackAt: null as Date | null,
  ackLoading: false,
  ackError: false,
  // The report behind a draft (useReport). Tests set it per case.
  draftReport: { report: null, loading: false, error: null, notFound: false, removed: false, fromCache: false } as Record<string, unknown>,
  api: vi.fn(),
}));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ team: state.team }) }));
vi.mock('./useAssignedReports', () => ({
  useAssignedReports: () => ({ reports: state.reports, loading: false, error: null, partialError: state.partialError }),
}));
vi.mock('./useClosedTeamReports', () => ({
  useClosedTeamReports: () => ({ reports: state.closed, loading: false, error: state.closedError, fromCache: false, retry: () => {} }),
}));

vi.mock('../reports/useReport', () => ({
  useAcknowledgedAt: () => ({ at: state.ackAt, acknowledged: !!state.ackAt, loading: state.ackLoading, error: state.ackError ? new Error('unavailable') : null }),
  useReportUpdates: () => ({ updates: [], error: null, loading: false, hasMore: false, retry: () => {}, loadOlder: () => {} }),
  useReport: () => ({ ...state.draftReport, retry: () => {} }),
}));
// The team summary card loads its own counts; keep those out of the call sequence these tests assert.
vi.mock('../../api/client', async (original) => ({ ...await original<typeof import('../../api/client')>(), api: (...a: unknown[]) => (a[0] === '/stats/team' ? Promise.resolve(null) : state.api(...a)) }));

import AssignmentsPage, { AssignedCard } from './AssignmentsPage';
import type { Report } from '../../types/domain';

vi.mock('./TeamIdentity', () => ({ default: () => <p>Team Alpha</p> }));
vi.mock('./AssignmentMap', () => ({ AssignmentMap: () => <div>Location map</div> }));
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
    render(<MemoryRouter><AssignedCard report={state.reports[0] as Report} scope="test" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
  });

  it('shows the acknowledgement time and no button once acknowledged', () => {
    state.ackAt = new Date('2026-10-17T10:00:00Z');
    render(<MemoryRouter><AssignedCard report={state.reports[0] as Report} scope="test" /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(screen.getByText(/Acknowledged/)).toBeInTheDocument();
  });

  it('does not offer another acknowledgement before its history loads', () => {
    state.ackLoading = true;
    render(<MemoryRouter><AssignedCard report={state.reports[0] as Report} scope="test" /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('Checking acknowledgement');
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
  });

  it('does not treat failed history reads as an unacknowledged assignment', () => {
    state.ackError = true;
    render(<MemoryRouter><AssignedCard report={state.reports[0] as Report} scope="test" /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not check acknowledgement');
    expect(screen.getByRole('button', { name: 'Reload assignments' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
  });

  it('keeps the confirmed acknowledgement when its stream has not caught up', async () => {
    render(<MemoryRouter><AssignedCard report={state.reports[0] as Report} scope="test" /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(await screen.findByText('Acknowledged')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(state.api).toHaveBeenCalledTimes(1);
  });
});

describe('AssignmentsPage recently closed (read-only, bounded)', async () => {
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

  it('shows no closed section when the team has none', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Recently closed' }));
    expect(screen.getByRole('heading', { name: 'No recently closed assignments' })).toBeInTheDocument();
  });

  it('lists at most the 10 most recent closed reports and says so when truncated', async () => {
    state.closed = Array.from({ length: 12 }, (_, i) => closedReport(i + 1));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Recently closed' }));
    const section = screen.getByRole('region', { name: 'Recently closed' });
    expect(section.querySelectorAll('li')).toHaveLength(10);
    expect(section).toHaveTextContent('Up to 10 most recently updated');
  });

  it('does not say the list is truncated when every closed report fits', async () => {
    state.closed = [closedReport(1), closedReport(2)];
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Recently closed' }));
    const section = screen.getByRole('region', { name: 'Recently closed' });
    expect(section.querySelectorAll('li')).toHaveLength(2);
    expect(section).toHaveTextContent('Up to 10 most recently updated');
  });

  it('gives closed reports no operational controls', async () => {
    state.closed = [closedReport(1)];
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Recently closed' }));
    const section = screen.getByRole('region', { name: 'Recently closed' });
    expect(section.querySelectorAll('button')).toHaveLength(0);
    expect(section.querySelectorAll('form, input, textarea, select')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Post an update' })).not.toBeInTheDocument();
  });

  it('links each closed report to its read-only detail route', async () => {
    state.closed = [closedReport(3)];
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Recently closed' }));
    expect(screen.getByText('Closed case 3.').closest('a')).toHaveAttribute('href', '/assignments/c3');
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
    expect(items[0]).toHaveTextContent('RR-1');
    expect(items[1]).toHaveTextContent('RR-2');
  });
});

beforeEach(() => { state.closedError = null; state.partialError = null; });
it('shows a recoverable closed-list error instead of hiding that view', async () => {
  state.closed = []; state.reports = []; state.closedError = new Error('offline');
  renderPage();
  await userEvent.click(screen.getByRole('button', { name: 'Recently closed' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load your assignments');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  expect(screen.queryByText('No recently closed assignments')).toBeNull();
});
it('never calls a failed multi-team channel an empty team', () => {
  state.reports = []; state.partialError = new Error('unavailable');
  renderPage();
  expect(screen.getByRole('alert')).toHaveTextContent('This list may be incomplete');
  expect(screen.queryByText('No open assignments right now')).toBeNull();
});
it('filters by reference and status, retaining direct report destinations', async () => {
  state.reports = [{ id: 'r-one', reference: 'RR-ONE', type: 'flood', status: 'Team Assigned', description: 'Water', createdAt: new Date(), updatedAt: new Date() }, { id: 'r-two', reference: 'RR-TWO', type: 'fire', status: 'Resolved', description: 'Smoke', createdAt: new Date(), updatedAt: new Date() }];
  renderPage();
  await userEvent.type(screen.getByRole('searchbox'), 'RR-TWO');
  expect(screen.queryByText('RR-ONE')).toBeNull();
  expect(screen.getByText('RR-TWO').closest('a')).toHaveAttribute('href', '/assignments/r-two');
  await userEvent.selectOptions(screen.getByLabelText('Status'), 'Team Assigned');
  expect(screen.getByText('No assignments match these filters')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getByText('RR-ONE')).toBeInTheDocument();
});


describe('assignment action guards and control relationships', () => {
  const report: Report = { id: 'r-guard', type: 'flood', status: 'Team Assigned', priority: 'critical', description: 'Water at entrance', verified: true, classification: '', addressText: '', photos: [], possibleDuplicates: [], createdAt: new Date(), updatedAt: new Date() };
  beforeEach(() => {
    state.ackAt = null; state.ackLoading = false; state.ackError = false;
    state.api.mockReset().mockResolvedValue({});
    state.position.mockReset().mockResolvedValue({ lat: 14.8, lng: 120.8 });
  });
  it('cancels an acknowledgement when its view leaves during GPS lookup', async () => {
    let finish!: (p: { lat: number; lng: number }) => void;
    state.position.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const ui = render(<MemoryRouter><AssignedCard report={report} scope="team-a" /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    ui.unmount();
    await act(async () => finish({ lat: 14.8, lng: 120.8 }));
    expect(state.api).not.toHaveBeenCalled();
  });
  it('exposes valid disclosure and pane targets with group names', async () => {
    render(<MemoryRouter><AssignedCard report={report} scope="team-a" /></MemoryRouter>);
    expect(screen.getByRole('group', { name: 'Assignment sections' })).toBeInTheDocument();
    const disclosure = screen.getByRole('button', { name: 'Post an update' });
    const target = document.getElementById(disclosure.getAttribute('aria-controls')!);
    expect(target).toHaveAttribute('hidden');
    await userEvent.click(disclosure);
    expect(target).not.toHaveAttribute('hidden');
    expect(screen.getByRole('form', { name: 'Rescue operation update' })).toBeInTheDocument();
    const history = screen.getByRole('button', { name: 'Progress history' });
    await userEvent.click(history);
    expect(document.getElementById(history.getAttribute('aria-controls')!)).not.toHaveAttribute('hidden');
    const brief = screen.getByRole('button', { name: 'Incident brief' });
    expect(document.getElementById(brief.getAttribute('aria-controls')!)).toHaveAttribute('hidden');
  });
  it('announces changed filter counts within the loaded assignment window', async () => {
    state.team = 'team-a'; state.reports = [report]; state.partialError = null;
    const { container } = render(<MemoryRouter><AssignmentsPage /></MemoryRouter>);
    const count = container.querySelector('[aria-live="polite"][aria-atomic="true"]');
    expect(count).toHaveTextContent('1 loaded assignment matches');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Find an assignment' }), 'No matching incident');
    expect(count).toHaveTextContent('0 loaded assignments match');
  });
});
