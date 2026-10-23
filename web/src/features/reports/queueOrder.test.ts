import { describe, it, expect } from 'vitest';
import { compareOldestFirst, orderQueue, sortQueueOldestFirst } from './queueOrder';

const at = (iso: string) => new Date(iso);

describe('compareOldestFirst', () => {
  it('puts the earlier submission first', () => {
    const rows = [
      { id: 'late', createdAt: at('2026-10-02T08:00:00Z') },
      { id: 'early', createdAt: at('2026-10-01T08:00:00Z') },
    ];
    expect(rows.sort(compareOldestFirst).map((r) => r.id)).toEqual(['early', 'late']);
  });

  it('breaks equal times by id so the order does not change between loads', () => {
    const t = at('2026-10-01T08:00:00Z');
    const rows = [{ id: 'r2', createdAt: t }, { id: 'r1', createdAt: t }];
    expect(rows.sort(compareOldestFirst).map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('puts a report with no usable time last', () => {
    const rows = [
      { id: 'undated', createdAt: undefined },
      { id: 'dated', createdAt: at('2026-10-01T08:00:00Z') },
    ];
    expect(rows.sort(compareOldestFirst).map((r) => r.id)).toEqual(['dated', 'undated']);
  });
});

describe('sortQueueOldestFirst', () => {
  it('returns a new list and leaves the input unchanged', () => {
    const input = [
      { id: 'b', createdAt: at('2026-10-02T08:00:00Z') },
      { id: 'a', createdAt: at('2026-10-01T08:00:00Z') },
    ];
    const out = sortQueueOldestFirst(input);
    expect(out.map((r) => r.id)).toEqual(['a', 'b']);
    expect(input.map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('orderQueue', () => {
  it('puts open reports oldest first, then the rest newest first, with undated rest last', () => {
    const rows = [
      { id: 'closedNew', createdAt: at('2026-10-05T08:00:00Z'), open: false },
      { id: 'openNew', createdAt: at('2026-10-02T08:00:00Z'), open: true },
      { id: 'openOld', createdAt: at('2026-10-01T08:00:00Z'), open: true },
      { id: 'closedOld', createdAt: at('2026-09-30T08:00:00Z'), open: false },
      { id: 'closedUndated', createdAt: undefined, open: false },
    ];
    const out = orderQueue(rows, (r) => r.open).map((r) => r.id);
    expect(out).toEqual(['openOld', 'openNew', 'closedNew', 'closedOld', 'closedUndated']);
  });
});
