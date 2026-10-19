import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Mock } from 'vitest';

interface Snap {
  id: string;
  exists: () => boolean;
  data: () => Record<string, unknown> | null;
  metadata: { fromCache: boolean };
}
interface Sub {
  ref: string;
  ok: (s: Snap) => void;
  err: (e: unknown) => void;
  opts: unknown;
  unsub: Mock<() => void>;
}

const h = vi.hoisted(() => ({ subs: [] as Sub[] }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, c: string, id: string) => `${c}/${id}`),
  collection: vi.fn((_db: unknown, c: string, id: string, sub: string) => `${c}/${id}/${sub}`),
  orderBy: vi.fn((field: string, dir: string) => ({ orderBy: field, dir })),
  limit: vi.fn((n: number) => ({ limit: n })),
  where: vi.fn((field: string, op: string, value: unknown) => ({ where: field, op, value })),
  query: vi.fn((ref: string) => ref),
  // onSnapshot(ref, [options,] onNext, onError): the options argument is optional.
  onSnapshot: vi.fn((ref: string, ...rest: unknown[]) => {
    const hasOptions = typeof rest[0] !== 'function';
    const [ok, err] = hasOptions ? rest.slice(1) : rest;
    const s = { ref, ok, err, opts: hasOptions ? rest[0] : undefined, unsub: vi.fn<() => void>() } as Sub;
    h.subs.push(s);
    return s.unsub;
  }),
}));
vi.mock('../../firebase', () => ({ getFirebaseDb: () => ({}) }));
import { useReport, useReportsByIds, useReportUpdates, useAcknowledgedAt } from './useReport';
import { query, where } from 'firebase/firestore';

describe('useAcknowledgedAt reads only acknowledgement rows', () => {
  it('filters by kind and reports the latest acknowledgement time, not the whole history', () => {
    const before = h.subs.length;
    const { result } = renderHook(() => useAcknowledgedAt('r1'));
    expect(where).toHaveBeenCalledWith('kind', '==', 'acknowledge');
    const sub = h.subs[before];
    const ack = (iso: string) => ({ data: () => ({ kind: 'acknowledge', at: { toDate: () => new Date(iso) } }) });
    act(() => {
      sub.ok({ docs: [ack('2026-10-18T10:00:00Z'), ack('2026-10-18T12:00:00Z')], metadata: { fromCache: false } } as unknown as Snap);
    });
    expect(result.current.acknowledged).toBe(true);
    expect(result.current.at?.toISOString()).toBe('2026-10-18T12:00:00.000Z');
  });
});

const snap = (id: string, data: Record<string, unknown> | null, fromCache = false): Snap => ({
  id, exists: () => data !== null, data: () => data, metadata: { fromCache },
});
const ts = (ms: number) => ({ toDate: () => new Date(ms) });
// The constraints (orderBy, limit) passed to the most recent query() call, after the collection ref.
const lastConstraints = () => vi.mocked(query).mock.calls.at(-1)!.slice(1) as unknown[];
const progressDoc = (i: number) => ({ id: `u${i}`, data: () => ({ kind: 'status', status: `Update ${i}`, note: `Note ${i}`, at: ts(i * 1000) }) });

describe('useReport', () => {
  beforeEach(() => { h.subs.length = 0; });

  it('loads, converts timestamps, and unsubscribes on unmount', () => {
    const { result, unmount } = renderHook(() => useReport('r1'));
    expect(result.current.loading).toBe(true);
    expect(h.subs[0].ref).toBe('reports/r1');
    act(() => h.subs[0].ok(snap('r1', { createdAt: ts(1000) })));
    expect(result.current.report?.createdAt).toBeInstanceOf(Date);
    unmount();
    expect(h.subs[0].unsub).toHaveBeenCalledTimes(1);
  });

  it('flags notFound for a missing doc and removed when it disappears', () => {
    const { result } = renderHook(() => useReport('r1'));
    act(() => h.subs[0].ok(snap('r1', null)));
    expect(result.current.notFound).toBe(true);
    expect(result.current.removed).toBe(false);
    const second = renderHook(() => useReport('r2'));
    act(() => h.subs[1].ok(snap('r2', {})));
    act(() => h.subs[1].ok(snap('r2', null)));
    expect(second.result.current.removed).toBe(true);
    expect(second.result.current.notFound).toBe(false);
  });

  it('surfaces listener errors and resubscribes on retry', () => {
    const { result } = renderHook(() => useReport('r1'));
    act(() => h.subs[0].err(new Error('permission-denied')));
    expect(result.current.error).toBeTruthy();
    expect(result.current.notFound).toBe(false);
    act(() => result.current.retry());
    expect(h.subs).toHaveLength(2);
    expect(h.subs[0].unsub).toHaveBeenCalled();
  });

  it('listens with metadata changes and exposes fromCache so a stale status can be flagged (F07)', () => {
    const { result } = renderHook(() => useReport('r1'));
    expect(h.subs[0].opts).toEqual({ includeMetadataChanges: true });
    act(() => h.subs[0].ok(snap('r1', { createdAt: ts(1000) }, true)));
    expect(result.current.fromCache).toBe(true);
    act(() => h.subs[0].ok(snap('r1', { createdAt: ts(1000) }, false)));
    expect(result.current.fromCache).toBe(false);
  });

  it('unsubscribes the old listener when the id changes', () => {
    const { rerender } = renderHook(({ id }) => useReport(id), { initialProps: { id: 'r1' } });
    rerender({ id: 'r2' });
    expect(h.subs[0].unsub).toHaveBeenCalledTimes(1);
    expect(h.subs[1].ref).toBe('reports/r2');
  });
});

describe('useReportsByIds', () => {
  beforeEach(() => { h.subs.length = 0; });

  it('listens per id, capped at 10, and unsubscribes on unmount', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `d${i}`);
    const { result, unmount } = renderHook(() => useReportsByIds(ids));
    expect(h.subs).toHaveLength(10);
    act(() => h.subs[0].ok(snap('d0', { description: 'x' })));
    expect(result.current.d0.report?.description).toBe('x');
    act(() => h.subs[1].ok(snap('d1', null)));
    expect(result.current.d1).toEqual({ report: null, loading: false });
    unmount();
    h.subs.forEach((s) => expect(s.unsub).toHaveBeenCalledTimes(1));
  });

  it('resubscribes when ids change', () => {
    const { rerender } = renderHook(({ ids }) => useReportsByIds(ids), { initialProps: { ids: ['a'] } });
    rerender({ ids: ['b'] });
    expect(h.subs[0].unsub).toHaveBeenCalledTimes(1);
    expect(h.subs[1].ref).toBe('reports/b');
  });
});

describe('useReportUpdates', () => {
  beforeEach(() => { h.subs.length = 0; });

  it('clears the previous report history immediately and ignores its late callbacks', () => {
    const { result, rerender } = renderHook(({ id }) => useReportUpdates(id), { initialProps: { id: 'r1' } });
    const old = h.subs[0];
    const history = { docs: [{ id: 'old', data: () => ({ status: 'Resolved', note: 'Previous report', at: ts(1000) }) }] };
    act(() => old.ok(history as unknown as never));
    expect(result.current.updates).toHaveLength(1);
    rerender({ id: 'r2' });
    expect(result.current.updates).toEqual([]);
    expect(result.current.loading).toBe(true);
    act(() => old.ok(history as unknown as never));
    expect(result.current.updates).toEqual([]);
    act(() => h.subs[1].ok({ docs: [] } as unknown as never));
    expect(result.current.loading).toBe(false);
  });

  it('subscribes to the newest 20 updates, newest first', () => {
    renderHook(() => useReportUpdates('r1'));
    expect(lastConstraints()).toEqual(expect.arrayContaining([{ orderBy: 'at', dir: 'desc' }, { limit: 20 }]));
  });

  it('loadOlder resubscribes with a window of 40 and drops the old listener', () => {
    const { result } = renderHook(() => useReportUpdates('r1'));
    act(() => result.current.loadOlder());
    expect(lastConstraints()).toEqual(expect.arrayContaining([{ limit: 40 }]));
    expect(h.subs.at(-1)!.ref).toBe('reports/r1/updates');
    expect(h.subs[0].unsub).toHaveBeenCalledTimes(1);
  });

  it('hasMore is false when the snapshot returns fewer than the window', () => {
    const { result } = renderHook(() => useReportUpdates('r1'));
    act(() => h.subs[0].ok({ docs: [progressDoc(2), progressDoc(1), progressDoc(0)] } as unknown as never));
    expect(result.current.hasMore).toBe(false);
    expect(result.current.updates.map((u) => u.id)).toEqual(['u0', 'u1', 'u2']);
  });

  it('hasMore is true when the snapshot returns exactly the window size', () => {
    const { result } = renderHook(() => useReportUpdates('r1'));
    const docs = Array.from({ length: 20 }, (_, i) => progressDoc(19 - i));
    act(() => h.subs[0].ok({ docs } as unknown as never));
    expect(result.current.hasMore).toBe(true);
  });

  it('skips acknowledgements and keeps progress entries in order', () => {
    const { result } = renderHook(() => useReportUpdates('r1'));
    expect(h.subs[0].ref).toBe('reports/r1/updates');
    act(() => h.subs[0].ok({
      docs: [
        { id: 'a1', data: () => ({ kind: 'acknowledge', byUid: 'u1', at: ts(1000) }) },
        { id: 'u1', data: () => ({ kind: 'status', status: 'Rescue in Progress', note: 'On site', peopleRescued: 2, at: ts(2000) }) },
      ],
    } as unknown as never));
    expect(result.current.updates.map((u) => u.id)).toEqual(['u1']);
    expect(result.current.updates[0]).toMatchObject({ status: 'Rescue in Progress', note: 'On site', peopleRescued: 2 });
  });
});
