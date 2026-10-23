import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

interface Sub {
  q: { ref: string; constraints: Array<Record<string, unknown>> };
  ok: (s: { docs: unknown[] }) => void;
  unsub: () => void;
}

const h = vi.hoisted(() => ({ subs: [] as Sub[] }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, c: string, id: string, sub: string) => ({ ref: `${c}/${id}/${sub}`, constraints: [] })),
  orderBy: vi.fn((field: string, dir: string) => ({ orderBy: field, dir })),
  limit: vi.fn((n: number) => ({ limit: n })),
  query: vi.fn((ref: { ref: string }, ...constraints: Array<Record<string, unknown>>) => ({ ref: ref.ref, constraints })),
  onSnapshot: vi.fn((q: Sub['q'], ok: Sub['ok']) => {
    const sub = { q, ok, unsub: vi.fn() } as Sub;
    h.subs.push(sub);
    return sub.unsub;
  }),
}));
vi.mock('../../firebase', () => ({ getFirebaseDb: () => ({}) }));

import { useReportUpdates } from './useReport';

// One snapshot of progress entries, newest first, as the listener delivers them.
const entries = (notes: string[]) => ({
  docs: notes.map((note, i) => ({
    id: `upd-${note.replace(/\s+/g, '-')}`,
    data: () => ({ status: 'Rescue in Progress', note, peopleRescued: 0, at: { toDate: () => new Date(10_000 - i) } }),
  })),
});

describe('useReportUpdates identity scope', () => {
  beforeEach(() => { h.subs.length = 0; });

  it('drops the rendered history in the same render when the identity changes, and unsubscribes the old listener', () => {
    const { result, rerender } = renderHook(({ scope }) => useReportUpdates('r1', scope), { initialProps: { scope: 'ana|responder|alpha' } });
    const first = h.subs.at(-1)!;
    act(() => first.ok(entries(['Alpha entry'])));
    expect(result.current.updates.map((u) => u.note)).toEqual(['Alpha entry']);

    rerender({ scope: 'ana|responder|bravo' });
    // Checked on the render itself, before any effect or callback runs.
    expect(result.current.updates).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(first.unsub).toHaveBeenCalledTimes(1);
  });

  it('ignores a late callback from the listener that was replaced', () => {
    const { result, rerender } = renderHook(({ scope }) => useReportUpdates('r1', scope), { initialProps: { scope: 'ana|responder|alpha' } });
    const first = h.subs.at(-1)!;
    rerender({ scope: 'ana|responder|bravo' });
    act(() => first.ok(entries(['Late alpha entry'])));
    expect(result.current.updates).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('a new identity gets its own listener and shows only its own entries', () => {
    const { result, rerender } = renderHook(({ scope }) => useReportUpdates('r1', scope), { initialProps: { scope: 'ana|responder|alpha' } });
    act(() => h.subs.at(-1)!.ok(entries(['Alpha entry'])));
    rerender({ scope: 'ben|responder|alpha' });
    const second = h.subs.at(-1)!;
    expect(h.subs).toHaveLength(2);
    act(() => second.ok(entries(['Ben entry'])));
    expect(result.current.updates.map((u) => u.note)).toEqual(['Ben entry']);
  });

  it('keeps the listener and its entries when the identity is unchanged', () => {
    const { result, rerender } = renderHook(({ scope }) => useReportUpdates('r1', scope), { initialProps: { scope: 'ana|responder|alpha' } });
    const first = h.subs.at(-1)!;
    act(() => first.ok(entries(['Kept entry'])));
    rerender({ scope: 'ana|responder|alpha' });
    expect(first.unsub).not.toHaveBeenCalled();
    expect(h.subs).toHaveLength(1);
    expect(result.current.updates.map((u) => u.note)).toEqual(['Kept entry']);
  });
});
