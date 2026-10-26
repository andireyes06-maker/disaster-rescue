import { describe, it, expect } from 'vitest';
import { teamSummary } from '../../src/services/statsService.js';

const rep = (over = {}) => ({
  type: 'flood', status: 'Rescue in Progress', priority: 'high', assignedTeamId: 'team-alpha',
  createdAt: new Date('2026-10-01T10:00:00Z'), updates: [], ...over,
});

describe('teamSummary', () => {
  it('counts only reports assigned to the given team', () => {
    const reports = [
      rep({ assignedTeamId: 'team-alpha', updates: [{ peopleRescued: 2 }] }),
      rep({ assignedTeamId: 'team-bravo', updates: [{ peopleRescued: 9 }] }),
      rep({ assignedTeamId: undefined, status: 'Submitted' }),
    ];
    const s = teamSummary(reports, 'team-alpha');
    expect(s.total).toBe(1);
    expect(s.open).toBe(1);
    expect(s.peopleRescued).toBe(2);
    expect(s.byStatus).toEqual({ 'Rescue in Progress': 1 });
  });

  it('returns zeros for a team with no reports', () => {
    expect(teamSummary([rep({ assignedTeamId: 'team-bravo' })], 'team-delta')).toEqual({
      total: 0, open: 0, resolved: 0, byStatus: {}, peopleRescued: 0,
    });
  });

  it('exposes no contact or location fields', () => {
    const s = teamSummary([rep({ reporterName: 'Someone', phone: '555', location: { lat: 1 } })], 'team-alpha');
    expect(Object.keys(s).sort()).toEqual(['byStatus', 'open', 'peopleRescued', 'resolved', 'total']);
  });
});
