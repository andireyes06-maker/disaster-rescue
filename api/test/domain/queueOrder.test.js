import { describe, expect, test } from 'vitest';
import { AWAITING_ACTION, compareOldestFirst, compareQueue, toMillis } from '../../src/domain/queueOrder.js';

describe('compareQueue', () => {
  test('critical, high, medium, low, then oldest first inside each level', () => {
    const rows = [
      { id: 'lowOld', priority: 'low', createdAt: new Date('2026-10-01') },
      { id: 'critNew', priority: 'critical', createdAt: new Date('2026-10-03') },
      { id: 'medOld', priority: 'medium', createdAt: new Date('2026-10-01') },
      { id: 'critOld', priority: 'critical', createdAt: new Date('2026-10-02') },
      { id: 'high', priority: 'high', createdAt: new Date('2026-10-01') },
    ];
    expect(rows.sort(compareQueue).map((r) => r.id)).toEqual(['critOld', 'critNew', 'high', 'medOld', 'lowOld']);
  });
  test('an unknown or missing priority counts as medium', () => {
    const rows = [
      { id: 'none', createdAt: new Date('2026-10-01') },
      { id: 'low', priority: 'low', createdAt: new Date('2026-10-01') },
      { id: 'constructor', priority: 'constructor', createdAt: new Date('2026-10-02') },
    ];
    expect(rows.sort(compareQueue).map((r) => r.id)).toEqual(['none', 'constructor', 'low']);
  });
});

describe('toMillis', () => {
  test('reads Date, number, ISO string and Timestamp-like values', () => {
    expect(toMillis(new Date('2026-10-01T00:00:00Z'))).toBe(Date.parse('2026-10-01T00:00:00Z'));
    expect(toMillis(5)).toBe(5);
    expect(toMillis('2026-10-01T00:00:00Z')).toBe(Date.parse('2026-10-01T00:00:00Z'));
    expect(toMillis({ toMillis: () => 9 })).toBe(9);
  });
  test('invalid or missing values sort last', () => {
    expect(toMillis(undefined)).toBe(Number.POSITIVE_INFINITY);
    expect(toMillis('not a date')).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('compareOldestFirst', () => {
  test('earlier createdAt first', () => {
    const a = { id: 'b', createdAt: new Date('2026-10-02') };
    const b = { id: 'a', createdAt: new Date('2026-10-01') };
    expect([a, b].sort(compareOldestFirst).map((r) => r.id)).toEqual(['a', 'b']);
  });
  test('equal createdAt breaks ties by id', () => {
    const t = new Date('2026-10-01');
    const rows = [{ id: 'r2', createdAt: t }, { id: 'r1', createdAt: t }];
    expect(rows.sort(compareOldestFirst).map((r) => r.id)).toEqual(['r1', 'r2']);
  });
  test('missing createdAt sorts after dated reports', () => {
    const rows = [{ id: 'x' }, { id: 'y', createdAt: new Date('2026-10-01') }];
    expect(rows.sort(compareOldestFirst).map((r) => r.id)).toEqual(['y', 'x']);
  });
  test('AWAITING_ACTION excludes closed states', () => {
    expect(AWAITING_ACTION.has('Submitted')).toBe(true);
    expect(AWAITING_ACTION.has('Closed')).toBe(false);
  });
});
