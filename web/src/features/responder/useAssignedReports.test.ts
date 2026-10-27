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

import { useAssignedReports } from './useAssignedReports';
import { REPORT_STATUSES, TERMINAL_STATUSES } from '../../types/domain';
import { where, orderBy, query, onSnapshot } from 'firebase/firestore';

const OPEN = REPORT_STATUSES.filter((s) => !TERMINAL_STATUSES.includes(s));
const ts = (ms: number) => ({ toDate: () => new Date(ms) });
const doc = (id: string, status: string, ms: number) => ({
  id,
  data: () => ({ status, type: 'flood', priority: 'critical', description: id, assignedTeamId: 'team-a', createdAt: ts(ms), updatedAt: ts(ms) }),
});
const snap = (docs: ReturnType<typeof doc>[], fromCache = false) => ({ docs, metadata: { fromCache } });

describe('useAssignedReports filters open statuses on the server', () => {
  beforeEach(() => {
    h.subs.length = 0;
    vi.clearAllMocks();
  });

  it('queries the team, open statuses only, oldest first', () => {
    renderHook(() => useAssignedReports('team-a'));
    expect(where).toHaveBeenCalledWith('assignedTeamId', '==', 'team-a');
    expect(where).toHaveBeenCalledWith('status', 'in', OPEN);
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'asc');
    for (const s of TERMINAL_STATUSES) expect(OPEN).not.toContain(s);
    expect(h.subs[0].constraints).toEqual(expect.arrayContaining([
      { where: 'assignedTeamId', op: '==', value: 'team-a' },
      { where: 'status', op: 'in', value: OPEN },
      { orderBy: 'createdAt', dir: 'asc' },
    ]));
    expect(onSnapshot).toHaveBeenCalledTimes(2);
    // The second listener finds reports that name the team among several.
    expect(h.subs[1].constraints).toEqual(expect.arrayContaining([
      { where: 'assignedTeamIds', op: 'array-contains', value: 'team-a' },
      { orderBy: 'createdAt', dir: 'asc' },
    ]));
  });

  it('gives a team change a new query and drops the old listener', () => {
    const { rerender } = renderHook(({ team }) => useAssignedReports(team), { initialProps: { team: 'team-a' as string | null } });
    rerender({ team: 'team-b' });
    expect(where).toHaveBeenCalledWith('assignedTeamId', '==', 'team-b');
    expect(h.subs[0].unsub).toHaveBeenCalledTimes(1);
    expect(h.subs[1].unsub).toHaveBeenCalledTimes(1);
    expect(h.subs[2].constraints).toEqual(expect.arrayContaining([{ where: 'assignedTeamId', op: '==', value: 'team-b' }]));
  });

  it('issues no query without a team, so a notification alone grants no access', () => {
    const { result } = renderHook(() => useAssignedReports(null));
    expect(query).not.toHaveBeenCalled();
    expect(onSnapshot).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.reports).toEqual([]);
  });

  it('passes the open reports from the server through, and flags cached results', () => {
    const { result } = renderHook(() => useAssignedReports('team-a'));
    act(() => h.subs[0].ok(snap([doc('r1', 'Team Assigned', 2000), doc('r2', 'Rescue in Progress', 1000)], true)));
    act(() => h.subs[1].ok(snap([], true)));
    expect(result.current.reports.map((r) => r.id)).toEqual(['r2', 'r1']);
    expect(result.current.fromCache).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('surfaces listener errors and resubscribes on retry', () => {
    const { result } = renderHook(() => useAssignedReports('team-a'));
    act(() => h.subs[0].err(new Error('unavailable')));
    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
    act(() => result.current.retry());
    expect(h.subs).toHaveLength(4);
    expect(h.subs[0].unsub).toHaveBeenCalled();
  });

  it('shows a report listed under several teams once, oldest first', () => {
    const { result } = renderHook(() => useAssignedReports('team-a'));
    act(() => h.subs[0].ok(snap([doc('r1', 'Team Assigned', 2000)])));
    act(() => h.subs[1].ok(snap([doc('r1', 'Team Assigned', 2000), doc('r2', 'Team Assigned', 1000)])));
    expect(result.current.reports.map((r) => r.id)).toEqual(['r2', 'r1']);
  });
});
