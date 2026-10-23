import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const h = vi.hoisted(() => ({
  where: vi.fn(),
  limit: vi.fn(() => "limit-clause"),
  orderBy: vi.fn(() => "order-clause"),
  onSnapshot: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  collection: h.collection,
  query: h.query,
  where: h.where,
  limit: h.limit, orderBy: h.orderBy,
  onSnapshot: h.onSnapshot,
}));
vi.mock('../../firebase', () => ({ getFirebaseDb: () => ({}) }));

import { useMyReports } from './useMyReports';

const doc = (id: string, createdAt: string) => ({
  id,
  data: () => ({ type: 'flood', status: 'Submitted', createdAt: new Date(createdAt), updatedAt: new Date(createdAt) }),
});

describe('useMyReports', () => {
  beforeEach(() => {
    h.collection.mockReset().mockReturnValue('reports-col');
    h.where.mockReset().mockReturnValue('where-clause');
    h.query.mockReset().mockReturnValue('my-query');
    h.onSnapshot.mockReset();
  });

  it('listens only to reports where reporterId equals the signed-in uid', () => {
    h.onSnapshot.mockReturnValue(() => {});
    renderHook(() => useMyReports('uid-1'));
    expect(h.where).toHaveBeenCalledWith('reporterId', '==', 'uid-1');
    expect(h.query).toHaveBeenCalledWith('reports-col', 'where-clause', 'order-clause', 'limit-clause');
    expect(h.limit).toHaveBeenCalledWith(50);
  });

  it('returns the reports newest first and listens with metadata changes', () => {
    h.onSnapshot.mockImplementation((_q, _opts, onNext) => {
      onNext({ docs: [doc('old', '2026-10-01T00:00:00Z'), doc('new', '2026-10-10T00:00:00Z')], metadata: { fromCache: false } });
      return () => {};
    });
    const { result } = renderHook(() => useMyReports('uid-1'));
    expect(h.onSnapshot.mock.calls[0][1]).toEqual({ includeMetadataChanges: true });
    expect(result.current.loading).toBe(false);
    expect(result.current.fromCache).toBe(false);
    expect(result.current.reports.map((r) => r.id)).toEqual(['new', 'old']);
  });

  it('exposes fromCache from the snapshot so the resident is told a status may be stale (F07)', () => {
    h.onSnapshot.mockImplementation((_q, _opts, onNext) => {
      onNext({ docs: [doc('a', '2026-10-01T00:00:00Z')], metadata: { fromCache: true } });
      return () => {};
    });
    const { result } = renderHook(() => useMyReports('uid-1'));
    expect(result.current.fromCache).toBe(true);
  });

  it('reports an error, and retry listens again', () => {
    let fail: ((e: Error) => void) | undefined;
    h.onSnapshot.mockImplementation((_q, _opts, _ok, onErr) => { fail = onErr; return () => {}; });
    const { result } = renderHook(() => useMyReports('uid-1'));
    act(() => fail?.(new Error('unavailable')));
    expect(result.current.error).toBeTruthy();
    act(() => result.current.retry());
    expect(h.onSnapshot).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });

  it('does not listen without a uid', () => {
    const { result } = renderHook(() => useMyReports(''));
    expect(h.onSnapshot).not.toHaveBeenCalled();
    expect(result.current.reports).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
