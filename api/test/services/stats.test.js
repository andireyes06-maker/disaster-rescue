import { describe, it, expect } from 'vitest';
import { buildStats } from '../../src/services/statsService.js';

const rep = (over = {}) => ({
  type: 'flood', status: 'Submitted', priority: 'medium',
  createdAt: new Date('2026-10-01T10:00:00Z'), updates: [], ...over,
});

describe('buildStats', () => {
  it('returns zeros and null response time for an empty set', () => {
    expect(buildStats([], {})).toEqual({
      total: 0, open: 0, resolved: 0, byType: {}, byStatus: {}, byPriority: {},
      perDay: [], avgResponseMinutes: null, peopleRescued: 0,
    });
  });

  it('counts open as everything except Resolved, Closed, Cancelled, Rejected, Duplicate', () => {
    const reports = ['Submitted', 'Under Verification', 'Verified', 'Awaiting Assignment',
      'Team Assigned', 'Rescue in Progress', 'Resolved', 'Closed', 'Cancelled', 'Rejected', 'Duplicate']
      .map((status) => rep({ status }));
    const s = buildStats(reports, {});
    expect(s.total).toBe(11);
    expect(s.open).toBe(6);
  });

  it('groups by type, status and priority and builds sorted perDay counts', () => {
    const reports = [
      rep({ type: 'fire', status: 'Verified', priority: 'high', createdAt: new Date('2026-10-02T08:00:00Z') }),
      rep({ type: 'flood', status: 'Verified', priority: 'high', createdAt: new Date('2026-10-01T23:00:00Z') }),
      rep({ type: 'flood', status: 'Resolved', priority: 'low', createdAt: new Date('2026-10-01T01:00:00Z') }),
    ];
    const s = buildStats(reports, {});
    expect(s.byType).toEqual({ fire: 1, flood: 2 });
    expect(s.byStatus).toEqual({ Verified: 2, Resolved: 1 });
    expect(s.byPriority).toEqual({ high: 2, low: 1 });
    expect(s.perDay).toEqual([{ date: '2026-10-01', count: 2 }, { date: '2026-10-02', count: 1 }]);
    expect(s.resolved).toBe(1);
  });

  it('averages minutes from createdAt to the Team Assigned time, or null when none', () => {
    const none = buildStats([rep()], {});
    expect(none.avgResponseMinutes).toBeNull();
    const reports = [
      rep({ assignedAt: new Date('2026-10-01T10:30:00Z') }),
      rep({ assignedAt: new Date('2026-10-01T11:30:00Z') }),
    ];
    expect(buildStats(reports, {}).avgResponseMinutes).toBe(60);
  });

  it('sums peopleRescued from updates', () => {
    const reports = [
      rep({ updates: [{ kind: 'status', peopleRescued: 4 }, { kind: 'acknowledge' }] }),
      rep({ updates: [{ kind: 'status', peopleRescued: 6 }] }),
    ];
    expect(buildStats(reports, {}).peopleRescued).toBe(10);
  });

  it('applies from and to to createdAt', () => {
    const reports = [
      rep({ createdAt: new Date('2026-09-30T23:59:00Z') }),
      rep({ createdAt: new Date('2026-10-01T12:00:00Z') }),
      rep({ createdAt: new Date('2026-10-05T12:00:00Z') }),
    ];
    const s = buildStats(reports, { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-10-02T00:00:00Z') });
    expect(s.total).toBe(1);
  });

  it('never exposes contact details or photo URLs', () => {
    const reports = [rep({ contact: { name: 'Maria Contact', phone: '+63 917 000 1111' }, photos: [{ url: 'https://photos.example/p1.jpg' }] })];
    const text = JSON.stringify(buildStats(reports, {}));
    expect(text).not.toContain('Maria Contact');
    expect(text).not.toContain('000 1111');
    expect(text).not.toContain('photos.example');
  });
});
