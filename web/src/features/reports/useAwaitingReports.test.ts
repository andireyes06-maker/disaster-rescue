import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

interface DocSnap {
  docs: { id: string; data: () => Record<string, unknown> }[];
  metadata: { fromCache: boolean };
}

const h = vi.hoisted(() => ({
  cb: (_s: DocSnap) => {},
  unsub: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'col'),
  query: vi.fn((...parts: unknown[]) => parts),
  where: (...a: unknown[]) => { h.where(...a); return ['where', ...a]; },
  orderBy: (...a: unknown[]) => { h.orderBy(...a); return ['orderBy', ...a]; },
  limit: (...a: unknown[]) => { h.limit(...a); return ['limit', ...a]; },
  onSnapshot: vi.fn((_q: unknown, _opts: unknown, ok: (s: DocSnap) => void) => {
    h.cb = ok;
    return h.unsub;
  }),
}));
vi.mock('../../firebase', () => ({ getFirebaseDb: () => ({}) }));
import { useAwaitingReports } from './useAwaitingReports';

const ts = (ms: number) => ({ toDate: () => new Date(ms) });
const snap = (docs: { id: string; data: Record<string, unknown> }[]): DocSnap => ({
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
  metadata: { fromCache: false },
});

describe('useAwaitingReports', () => {
  beforeEach(() => { h.where.mockClear(); h.orderBy.mockClear(); h.limit.mockClear(); });

  it('queries open statuses oldest first, bounded by the window', () => {
    renderHook(() => useAwaitingReports());
    expect(h.where).toHaveBeenCalledWith('status', 'in', expect.arrayContaining(['Submitted', 'Awaiting Assignment', 'Resolved']));
    expect(h.orderBy).toHaveBeenCalledWith('createdAt', 'asc');
    expect(h.limit).toHaveBeenCalledWith(50);
  });

  it('orders the results oldest first with a deterministic id tie-break', () => {
    const { result } = renderHook(() => useAwaitingReports());
    act(() => h.cb(snap([
      { id: 'late', data: { status: 'Submitted', createdAt: ts(5000), updatedAt: ts(5000) } },
      { id: 'b', data: { status: 'Submitted', createdAt: ts(1000), updatedAt: ts(1000) } },
      { id: 'a', data: { status: 'Submitted', createdAt: ts(1000), updatedAt: ts(1000) } },
    ])));
    expect(result.current.reports.map((r) => r.id)).toEqual(['a', 'b', 'late']);
  });
});
