import { describe, it, expect } from 'vitest';
import { compareOldestFirst, orderQueue, sortQueue, sortRows } from './queueOrder';

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

describe('sortQueue', () => {
  it('returns a new list and leaves the input unchanged', () => {
    const input = [
      { id: 'b', createdAt: at('2026-10-02T08:00:00Z') },
      { id: 'a', createdAt: at('2026-10-01T08:00:00Z') },
    ];
    const out = sortQueue(input);
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

describe('compareQueue', () => {
  it('puts critical first, then high, medium and low, oldest first inside each level', () => {
    const rows = [
      { id: 'lowOld', priority: 'low', createdAt: at('2026-10-01T08:00:00Z') },
      { id: 'critNew', priority: 'critical', createdAt: at('2026-10-03T08:00:00Z') },
      { id: 'critOld', priority: 'critical', createdAt: at('2026-10-02T08:00:00Z') },
      { id: 'high', priority: 'high', createdAt: at('2026-10-01T08:00:00Z') },
      { id: 'medium', priority: 'medium', createdAt: at('2026-10-01T08:00:00Z') },
    ];
    expect(sortQueue(rows).map((r) => r.id)).toEqual(['critOld', 'critNew', 'high', 'medium', 'lowOld']);
  });
});

describe('sortRows', () => {
  const rows = [
    { id: 'mid', createdAt: at('2026-10-02T08:00:00Z'), priority: 'low' },
    { id: 'new', createdAt: at('2026-10-03T08:00:00Z'), priority: 'critical' },
    { id: 'old', createdAt: at('2026-10-01T08:00:00Z'), priority: 'medium' },
    { id: 'none', createdAt: undefined, priority: 'high' },
  ];
  it('newest to oldest, with an undated report last', () => {
    expect(sortRows(rows, 'newest').map((r) => r.id)).toEqual(['new', 'mid', 'old', 'none']);
  });
  it('oldest to newest, with an undated report last', () => {
    expect(sortRows(rows, 'oldest').map((r) => r.id)).toEqual(['old', 'mid', 'new', 'none']);
  });
  it('priority highest or lowest first, older first inside one level', () => {
    expect(sortRows(rows, 'priority-high').map((r) => r.id)).toEqual(['new', 'none', 'old', 'mid']);
    expect(sortRows(rows, 'priority-low').map((r) => r.id)).toEqual(['mid', 'old', 'none', 'new']);
  });
  it('does not change the list it was given', () => {
    const copy = [...rows];
    sortRows(rows, 'newest');
    expect(rows).toEqual(copy);
  });
});
