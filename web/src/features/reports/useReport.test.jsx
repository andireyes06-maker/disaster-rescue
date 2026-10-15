import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const h = vi.hoisted(() => ({ subs: [] }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, c, id) => `${c}/${id}`),
  onSnapshot: vi.fn((ref, ok, err) => {
    const s = { ref, ok, err, unsub: vi.fn() };
    h.subs.push(s);
    return s.unsub;
  }),
}));
vi.mock('../../firebase.js', () => ({ getFirebaseDb: () => ({}) }));
import { useReport, useReportsByIds } from './useReport.js';

const snap = (id, data) => ({ id, exists: () => data !== null, data: () => data });
const ts = (ms) => ({ toDate: () => new Date(ms) });

describe('useReport', () => {
  beforeEach(() => { h.subs.length = 0; });

  it('loads, converts timestamps, and unsubscribes on unmount', () => {
    const { result, unmount } = renderHook(() => useReport('r1'));
    expect(result.current.loading).toBe(true);
    expect(h.subs[0].ref).toBe('reports/r1');
    act(() => h.subs[0].ok(snap('r1', { createdAt: ts(1000) })));
    expect(result.current.report.createdAt).toBeInstanceOf(Date);
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
    expect(result.current.d0.report.description).toBe('x');
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
