import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Mock } from 'vitest';

interface Sub {
  path: string;
  limit: number | undefined;
  ok: (s: unknown) => void;
  err: (e: unknown) => void;
  active: boolean;
  unsub: Mock<() => void>;
}

// A fake Firestore: the real hooks run, and the test serves snapshots from raw rows, as the server would.
const h = vi.hoisted(() => ({ subs: [] as Sub[], team: 'team-a' as string | null }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, c: string, id: string) => ({ path: `${c}/${id}` })),
  collection: vi.fn((_db: unknown, c: string, id: string, sub: string) => ({ path: `${c}/${id}/${sub}` })),
  orderBy: vi.fn((field: string, dir: string) => ({ orderBy: field, dir })),
  limit: vi.fn((n: number) => ({ limit: n })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ where: field, op, value })),
  query: vi.fn((ref: { path: string }, ...constraints: Record<string, unknown>[]) => ({ path: ref.path, constraints })),
  onSnapshot: vi.fn((target: { path: string; constraints?: Record<string, unknown>[] }, ...rest: unknown[]) => {
    const hasOptions = typeof rest[0] !== 'function';
    const [ok, err] = hasOptions ? rest.slice(1) : rest;
    const limitConstraint = target.constraints?.find((c) => 'limit' in c);
    const sub: Sub = {
      path: target.path,
      limit: limitConstraint?.limit as number | undefined,
      ok: ok as Sub['ok'],
      err: err as Sub['err'],
      active: true,
      unsub: vi.fn(() => { sub.active = false; }),
    };
    h.subs.push(sub);
    return sub.unsub;
  }),
}));
vi.mock('../../firebase', () => ({ getFirebaseDb: () => ({}) }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ team: h.team }) }));

vi.mock('./AssignmentMap', () => ({ AssignmentMap: () => <div>Location map</div> }));
import ClosedReportPage from './ClosedReportDetail';

const ts = (ms: number) => ({ toDate: () => new Date(ms) });
const closedRaw = {
  reference: 'DR-AAAAAA', type: 'flood', status: 'Closed', priority: 'high', verified: true,
  description: 'Water reached the second floor.', addressText: 'Riverside District', classification: '', photos: [],
  possibleDuplicates: [], assignedTeamId: 'team-a', location: null,
  createdAt: ts(Date.UTC(2026, 9, 10, 8)), updatedAt: ts(Date.UTC(2026, 9, 12, 9)),
};

// Raw update rows, newest at 24. Every fourth row is an acknowledgement (no status), so the first
// 20 raw rows hold only 15 progress entries.
const rows = Array.from({ length: 24 }, (_, i) => {
  const n = i + 1;
  const ms = n * 1000;
  const data = n % 4 === 0
    ? { kind: 'acknowledge', at: ts(ms) }
    : { kind: 'status', status: `Update ${n}`, note: `Note ${n}`, peopleRescued: 0, at: ts(ms) };
  return { id: `u${n}`, ms, data };
});

const latest = (match: (s: Sub) => boolean) => [...h.subs].reverse().find((s) => s.active && match(s));
const reportSub = () => latest((s) => s.path === 'reports/r1');
const updatesSub = () => latest((s) => s.path === 'reports/r1/updates');

function serveReport(raw: Record<string, unknown> = closedRaw, fromCache = false) {
  act(() => reportSub()!.ok({ id: 'r1', exists: () => true, data: () => raw, metadata: { fromCache } }));
}

// Serves the newest `limit` raw rows, as the server does for orderBy(at desc) + limit.
function serveUpdates() {
  const sub = updatesSub();
  if (!sub) return; // the page may have unmounted the history after a redirect or refusal
  const docs = [...rows].sort((a, b) => b.ms - a.ms).slice(0, sub.limit).map((r) => ({ id: r.id, data: () => r.data }));
  act(() => sub.ok({ docs, metadata: { fromCache: false } }));
}

const renderAt = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/assignments" element={<h1>Assignments list</h1>} />
      <Route path="/assignments/:id" element={<ClosedReportPage />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  h.subs.length = 0;
  h.team = 'team-a';
});

describe('ClosedReportPage access', () => {
  it('shows the closed report read-only to the current team', () => {
    renderAt('/assignments/r1');
    serveReport();
    serveUpdates();
    expect(screen.getByRole('heading', { name: 'flood report' })).toBeInTheDocument();
    expect(screen.getByText('Water reached the second floor.')).toBeInTheDocument();
  });

  it('gives a closed report no operational controls', () => {
    renderAt('/assignments/r1');
    serveReport();
    serveUpdates();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Post an update' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /close|assign|save|note/i })).not.toBeInTheDocument();
  });

  it('keeps an active report at its own detail destination', () => {
    renderAt('/assignments/r1');
    serveReport({ ...closedRaw, status: 'Team Assigned' });
    serveUpdates();
    expect(screen.queryByRole('heading', { name: 'Assignments list' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'flood report' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post an update' })).toBeInTheDocument();
  });

  it('shows the recovery, not report data, when the report belongs to another team', () => {
    renderAt('/assignments/r1');
    serveReport({ ...closedRaw, assignedTeamId: 'team-b' });
    serveUpdates();
    expect(screen.getByRole('heading', { name: 'Report not available to your team' })).toBeInTheDocument();
    expect(screen.queryByText('Water reached the second floor.')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to assignments' })).toHaveAttribute('href', '/assignments');
  });

  it('shows the recovery when the read is refused', () => {
    renderAt('/assignments/r1');
    act(() => reportSub()!.err(Object.assign(new Error('denied'), { code: 'permission-denied' })));
    serveUpdates();
    expect(screen.getByRole('heading', { name: 'Report not available to your team' })).toBeInTheDocument();
    expect(screen.queryByText('Water reached the second floor.')).not.toBeInTheDocument();
  });

  it('shows the recovery when the report does not exist', () => {
    renderAt('/assignments/r1');
    act(() => reportSub()!.ok({ id: 'r1', exists: () => false, data: () => undefined, metadata: { fromCache: false } }));
    serveUpdates();
    expect(screen.getByRole('heading', { name: 'Report not available to your team' })).toBeInTheDocument();
  });

  it('explains when the account has no rescue team', () => {
    h.team = null;
    renderAt('/assignments/r1');
    expect(screen.getByRole('heading', { name: 'Your account is not linked to a rescue team' })).toBeInTheDocument();
    expect(screen.queryByText('Water reached the second floor.')).not.toBeInTheDocument();
  });
});

describe('ClosedReportPage progress history (read-only navigation)', () => {
  it('reveals Load older updates when the newest 20 raw rows are full, counting acknowledgement rows', () => {
    renderAt('/assignments/r1');
    serveReport();
    serveUpdates();
    expect(updatesSub()!.limit).toBe(20);
    // 20 raw rows include 5 acknowledgements, so 15 progress entries are loaded. The newest 5 show; the rest sit behind the disclosure.
    expect(screen.getAllByRole('listitem').filter((li) => li.closest('.closed-history'))).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Show 10 older updates' })).toBeInTheDocument();
    expect(screen.queryByText('Update 1')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load older updates' })).toBeInTheDocument();
  });

  it('does not offer Load older updates when the window is not full', () => {
    renderAt('/assignments/r1');
    serveReport();
    act(() => updatesSub()!.ok({ docs: [{ id: 'u1', data: () => rows[0].data }], metadata: { fromCache: false } }));
    expect(screen.queryByRole('button', { name: 'Load older updates' })).not.toBeInTheDocument();
  });

  it('activating Load older updates widens the window and shows the older entries', async () => {
    renderAt('/assignments/r1');
    serveReport();
    serveUpdates();
    await userEvent.click(screen.getByRole('button', { name: 'Load older updates' }));
    expect(updatesSub()!.limit).toBe(40);
    expect(screen.getByText('Loading progress history')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load older updates' })).not.toBeInTheDocument();
    serveUpdates();
    await userEvent.click(screen.getByRole('button', { name: /Show \d+ older updates/ }));
    expect(screen.getByText('Update 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load older updates' })).not.toBeInTheDocument();
  });

  it('shows an error with a retry control when the older window fails, and retry re-requests the wider window', async () => {
    renderAt('/assignments/r1');
    serveReport();
    serveUpdates();
    await userEvent.click(screen.getByRole('button', { name: 'Load older updates' }));
    act(() => updatesSub()!.err(new Error('unavailable')));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the progress history.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    const subsBefore = h.subs.length;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(h.subs.length).toBe(subsBefore + 1);
    expect(updatesSub()!.limit).toBe(40);
    serveUpdates();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Show \d+ older updates/ }));
    expect(screen.getByText('Update 1')).toBeInTheDocument();
  });

  it('exposes no operational action even while history is loading or failed', async () => {
    renderAt('/assignments/r1');
    serveReport();
    serveUpdates();
    await userEvent.click(screen.getByRole('button', { name: 'Load older updates' }));
    act(() => updatesSub()!.err(new Error('unavailable')));
    // Every control on the page must be a read-only history or retry control. Anything else fails the test.
    const allowed = /^(Try again|Load older updates|Show \d+ older updates|Hide older updates|Show full note|Open in maps)$/;
    const names = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    for (const name of names) expect(name).toMatch(allowed);
    const operational = /acknowledge|post an update|submit|close|assign|save|note|status|reopen|resolve/i;
    expect(names.filter((n) => operational.test(n))).toEqual([]);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

it('discloses a cached active report before operational actions while the browser is online', () => {
  renderAt('/assignments/r1');
  serveReport({ ...closedRaw, status: 'Team Assigned' }, true);
  expect(screen.getByText(/Showing saved information/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Post an update' })).toBeInTheDocument();
});
