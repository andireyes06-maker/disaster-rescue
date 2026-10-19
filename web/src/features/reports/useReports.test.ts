import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

interface DocSnap {
  metadata: { fromCache: boolean };
  docs: { id: string; data: () => Record<string, unknown> }[];
}

const h = vi.hoisted(() => ({
  cb: (_s: DocSnap) => {},
  errCb: (_e: unknown) => {},
  unsub: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn((c: unknown) => c),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn((q: unknown, _options: unknown, ok: (s: DocSnap) => void, err: (e: unknown) => void) => {
    h.cb = ok;
    h.errCb = err;
    return h.unsub;
  }),
}));
vi.mock('../../firebase', () => ({ getFirebaseDb: () => ({}) }));
import { useReports } from './useReports';

const snap = (docs: { id: string; data: Record<string, unknown> }[]): DocSnap => ({
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
  metadata: { fromCache: false },
});
const ts = (ms: number) => ({ toDate: () => new Date(ms) });

describe('useReports', () => {
  beforeEach(() => { h.unsub.mockClear(); });

  it('converts timestamps and sorts newest first', () => {
    const { result } = renderHook(() => useReports());
    expect(result.current.loading).toBe(true);
    act(() => h.cb(snap([
      { id: 'a', data: { createdAt: ts(1000), updatedAt: ts(1000) } },
      { id: 'b', data: { createdAt: ts(5000), updatedAt: ts(6000) } },
    ])));
    expect(result.current.loading).toBe(false);
    expect(result.current.reports.map((r) => r.id)).toEqual(['b', 'a']);
    expect(result.current.reports[0].createdAt).toBeInstanceOf(Date);
    expect(result.current.reports[0].updatedAt.getTime()).toBe(6000);
  });

  it('surfaces cache freshness changes without dropping the reports', () => {
    const { result } = renderHook(() => useReports());
    const snapshot = snap([{ id: 'a', data: { createdAt: ts(1000) } }]);
    act(() => h.cb({ ...snapshot, metadata: { fromCache: true } }));
    expect(result.current.fromCache).toBe(true);
    act(() => h.cb(snapshot));
    expect(result.current.fromCache).toBe(false);
    expect(result.current.reports).toHaveLength(1);
  });

  it('reports errors', () => {
    const { result } = renderHook(() => useReports());
    act(() => h.errCb(new Error('denied')));
    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useReports());
    unmount();
    expect(h.unsub).toHaveBeenCalledTimes(1);
  });
});
