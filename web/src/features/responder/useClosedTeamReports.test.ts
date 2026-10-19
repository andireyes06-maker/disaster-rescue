import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Mock } from 'vitest';

interface Sub {
  constraints: Record<string, unknown>[];
  ok: (s: unknown) => void;
  err: (e: unknown) => void;
  unsub: Mock<() => void>;
}

const h = vi.hoisted(() => ({ subs: [] as Sub[] }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, c: string) => ({ path: c, constraints: [] })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ where: field, op, value })),
  orderBy: vi.fn((field: string, dir: string) => ({ orderBy: field, dir })),
  limit: vi.fn((n: number) => ({ limit: n })),
  query: vi.fn((ref: { path: string }, ...constraints: Record<string, unknown>[]) => ({ path: ref.path, constraints })),
  onSnapshot: vi.fn((target: { constraints: Record<string, unknown>[] }, ...rest: unknown[]) => {
    const [ok, err] = typeof rest[0] !== 'function' ? rest.slice(1) : rest;
    const s: Sub = { constraints: target.constraints, ok: ok as Sub['ok'], err: err as Sub['err'], unsub: vi.fn<() => void>() };
    h.subs.push(s);
    return s.unsub;
  }),
}));
vi.mock('../../firebase', () => ({ getFirebaseDb: () => ({}) }));

import { useClosedTeamReports } from './useClosedTeamReports';
import { where, orderBy, limit, query, onSnapshot } from 'firebase/firestore';

const ts = (ms: number) => ({ toDate: () => new Date(ms) });
const doc = (id: string, status: string, ms: number) => ({
  id,
  data: () => ({ status, type: 'fire', priority: 'high', description: id, assignedTeamId: 'team-a', createdAt: ts(ms), updatedAt: ts(ms) }),
});
const snap = (docs: ReturnType<typeof doc>[], fromCache = false) => ({ docs, metadata: { fromCache } });
const TERMINAL = ['Closed', 'Rejected', 'Duplicate', 'Cancelled'];

describe('useClosedTeamReports is bounded on the server', () => {
  beforeEach(() => {
    h.subs.length = 0;
    vi.clearAllMocks();
  });

  it('queries the team, terminal statuses only, newest change first, with a limit of 10', () => {
    renderHook(() => useClosedTeamReports('team-a'));
    expect(where).toHaveBeenCalledWith('assignedTeamId', '==', 'team-a');
    expect(where).toHaveBeenCalledWith('status', 'in', TERMINAL);
    expect(orderBy).toHaveBeenCalledWith('updatedAt', 'desc');
    expect(limit).toHaveBeenCalledWith(10);
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(h.subs[0].constraints).toEqual(expect.arrayContaining([
      { where: 'assignedTeamId', op: '==', value: 'team-a' },
      { where: 'status', op: 'in', value: TERMINAL },
      { orderBy: 'updatedAt', dir: 'desc' },
      { limit: 10 },
    ]));
  });

  it('issues one listener only, and never a status-free team query', () => {
    renderHook(() => useClosedTeamReports('team-a'));
    expect(query).toHaveBeenCalledTimes(1);
    expect(vi.mocked(query).mock.calls[0].slice(1)).toEqual(expect.arrayContaining([{ where: 'status', op: 'in', value: TERMINAL }]));
  });

  it('gives a team change a new query and drops the old listener', () => {
    const { rerender } = renderHook(({ team }) => useClosedTeamReports(team), { initialProps: { team: 'team-a' as string | null } });
    rerender({ team: 'team-b' });
    expect(where).toHaveBeenCalledWith('assignedTeamId', '==', 'team-b');
    expect(h.subs[0].unsub).toHaveBeenCalledTimes(1);
    expect(h.subs[1].constraints).toEqual(expect.arrayContaining([{ where: 'assignedTeamId', op: '==', value: 'team-b' }]));
  });

  it('issues no query and no listener without a team, so a notification alone grants no access', () => {
    const { result } = renderHook(() => useClosedTeamReports(null));
    expect(query).not.toHaveBeenCalled();
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.reports).toEqual([]);
  });

  it('shows the server result as returned, without a second team listener', () => {
    const { result } = renderHook(() => useClosedTeamReports('team-a'));
    act(() => h.subs[0].ok(snap([doc('c1', 'Closed', 2000), doc('c2', 'Cancelled', 1000)], true)));
    expect(result.current.reports.map((r) => r.id)).toEqual(['c1', 'c2']);
    expect(result.current.fromCache).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(h.subs).toHaveLength(1);
  });

  it('surfaces listener errors and resubscribes on retry', () => {
    const { result } = renderHook(() => useClosedTeamReports('team-a'));
    act(() => h.subs[0].err(new Error('unavailable')));
    expect(result.current.error).toBeTruthy();
    act(() => result.current.retry());
    expect(h.subs).toHaveLength(2);
    expect(h.subs[0].unsub).toHaveBeenCalled();
  });
});
