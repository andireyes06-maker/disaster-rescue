import { describe, expect, it } from 'vitest';
import { buildScenario, EXPECTED, DEFAULT_NOW } from '../../demo-data/scenario.mjs';
import { STATUS, isOpen } from '../src/domain/workflow.js';
import { buildStats } from '../src/services/statsService.js';
import { findPossibleDuplicates } from '../src/domain/duplicates.js';

const s = buildScenario({ now: DEFAULT_NOW });
const nowMs = new Date(DEFAULT_NOW).getTime();
const reportById = new Map(s.reports.map((r) => [r.id, r]));
const byType = (rows) => rows.reduce((acc, r) => ({ ...acc, [r.type]: (acc[r.type] ?? 0) + 1 }), {});

describe('demo scenario: counts', () => {
  it('has 24 linked reports with stable IDs', () => {
    expect(s.reports).toHaveLength(EXPECTED.total);
    expect(s.reports.map((r) => r.id)).toEqual(Array.from({ length: 24 }, (_, i) => `demo-report-${String(i + 1).padStart(2, '0')}`));
  });

  it('matches the expected status distribution', () => {
    const counts = s.reports.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});
    expect(counts).toEqual(EXPECTED.byStatus);
  });

  it('matches type counts', () => {
    expect(byType(s.reports)).toEqual(EXPECTED.byType);
  });

  it('derives active, critical, verified and needs-verification from the records', () => {
    const stats = buildStats(s.reports.map((r) => ({ ...r, updates: s.updates.filter((u) => u.reportId === r.id) })));
    expect(stats.total).toBe(EXPECTED.total);
    expect(stats.open).toBe(EXPECTED.active);
    expect(s.reports.filter((r) => r.priority === 'critical' && isOpen(r.status) && !['Resolved', 'Closed'].includes(r.status)).length).toBe(EXPECTED.activeCritical);
    expect(s.reports.filter((r) => r.verified).length).toBe(EXPECTED.verified);
    expect(s.reports.filter((r) => ['Submitted', 'Under Verification'].includes(r.status)).length).toBe(EXPECTED.needsVerification);
  });

  it('keeps verified in step with the lifecycle', () => {
    for (const r of s.reports) {
      const expected = !['Submitted', 'Under Verification', 'Rejected', 'Duplicate', 'Cancelled'].includes(r.status);
      expect(r.verified, r.id).toBe(expected);
    }
  });
});

describe('demo scenario: ownership and teams', () => {
  it('gives resident A the six reports named in the brief', () => {
    const ids = s.reports.filter((r) => r.reporterId === 'demo-resident-a').map((r) => r.id.slice(-2));
    expect(ids.sort()).toEqual(['01', '05', '09', '12', '15', '18']);
  });

  it('partitions every report to exactly one resident', () => {
    const owners = s.reports.map((r) => r.reporterId);
    expect(owners.every((o) => ['demo-resident-a', 'demo-resident-b', 'demo-resident-c', 'demo-resident-d'].includes(o))).toBe(true);
  });

  it('has twelve teams with the expected busy and available split', () => {
    expect(s.teams).toHaveLength(12);
    expect(s.teams.filter((t) => t.busy)).toHaveLength(EXPECTED.busyTeams);
    expect(s.teams.filter((t) => !t.busy)).toHaveLength(EXPECTED.availableTeams);
  });

  it('keeps team.currentReportId consistent with an active report', () => {
    for (const t of s.teams) {
      if (t.busy) {
        const r = reportById.get(t.currentReportId);
        expect(r, t.id).toBeDefined();
        expect(r.assignedTeamId).toBe(t.id);
        expect(isOpen(r.status) || r.status === 'Resolved').toBe(true);
      } else {
        expect(t.currentReportId, t.id).toBeNull();
      }
    }
  });

  it('never assigns one team to two active reports', () => {
    const active = s.reports.filter((r) => r.assignedTeamId && !['Closed', 'Rejected', 'Duplicate', 'Cancelled'].includes(r.status));
    const teamIds = active.map((r) => r.assignedTeamId);
    expect(new Set(teamIds).size).toBe(teamIds.length);
  });

  it('gives the default responder an actionable assignment on report 12', () => {
    const alpha = s.teams.find((t) => t.id === 'demo-team-alpha');
    expect(alpha.members).toEqual(['demo-responder-a']);
    expect(alpha.currentReportId).toBe('demo-report-12');
    expect(reportById.get('demo-report-12').status).toBe(STATUS.TEAM_ASSIGNED);
  });

  it('gives every responder account a team that exists', () => {
    const teamIds = new Set(s.teams.map((t) => t.id));
    for (const a of s.accounts.filter((x) => x.role === 'responder')) expect(teamIds.has(a.team), a.uid).toBe(true);
  });
});

describe('demo scenario: histories, time and privacy', () => {
  it('never places a timestamp after the scenario clock', () => {
    for (const r of s.reports) {
      expect(r.createdAt.getTime()).toBeLessThanOrEqual(nowMs);
      expect(r.updatedAt.getTime()).toBeLessThanOrEqual(nowMs);
      if (r.assignedAt) expect(r.assignedAt.getTime()).toBeGreaterThanOrEqual(r.createdAt.getTime());
    }
    for (const u of s.updates) expect(u.at.getTime()).toBeLessThanOrEqual(nowMs);
  });

  it('spreads creation across fourteen days', () => {
    const ages = s.reports.map((r) => (nowMs - r.createdAt.getTime()) / 3600000);
    expect(Math.max(...ages)).toBeLessThanOrEqual(14 * 24);
    expect(Math.max(...ages)).toBeGreaterThan(13 * 24);
  });

  it('counts people rescued as increments that total the expected value', () => {
    const total = s.updates.reduce((sum, u) => sum + (u.peopleRescued ?? 0), 0);
    expect(total).toBe(EXPECTED.peopleRescued);
  });

  it('keeps every update, audit, and notification tied to a real report and user', () => {
    const uids = new Set(s.accounts.map((a) => a.uid));
    for (const u of s.updates) {
      expect(reportById.has(u.reportId), u.id).toBe(true);
      expect(uids.has(u.byUid), u.id).toBe(true);
    }
    for (const a of s.audit) {
      expect(reportById.has(a.reportId), a.id).toBe(true);
      expect(uids.has(a.actorUid), a.id).toBe(true);
    }
    for (const n of s.notifications) {
      expect(reportById.has(n.reportId), n.id).toBe(true);
      expect(uids.has(n.recipientUid), n.id).toBe(true);
    }
  });

  it('gives report 23 a valid duplicate of report 15 that is inside the duplicate window', () => {
    const r23 = reportById.get('demo-report-23');
    const r15 = reportById.get('demo-report-15');
    expect(r23.duplicateOf).toBe('demo-report-15');
    // Checked as it would have been at submission: report 23 arrives while report 15 is still open.
    const hits = findPossibleDuplicates(
      { ...r23, status: 'Submitted', id: 'probe' },
      [{ ...r15, status: 'Rescue in Progress' }],
    );
    expect(hits).toContain('demo-report-15');
  });

  it('stores only canonical nested locations and coarse public points', () => {
    for (const r of s.reports) {
      expect(typeof r.location.lat).toBe('number');
      expect(typeof r.location.lng).toBe('number');
      expect(r.coarseLocation).toEqual({ lat: expect.any(Number), lng: expect.any(Number) });
      expect(r.lat).toBeUndefined();
    }
  });

  it('keeps emulator IDs and uses reserved example-domain email addresses', () => {
    for (const a of s.accounts) {
      expect(a.uid.startsWith('demo-')).toBe(true);
      expect(a.email.endsWith('@harbor.example')).toBe(true);
    }
  });

  it('keeps photo counts matching the brief', () => {
    const counts = Object.fromEntries(s.reports.map((r) => [r.id.slice(-2), r.photos.length]));
    expect(counts['01']).toBe(3);
    expect(counts['15']).toBe(3);
    for (const n of ['04', '08', '09', '11', '17', '22', '24']) expect(counts[n], n).toBe(0);
    for (const n of ['07', '12', '13', '14']) expect(counts[n], n).toBe(2);
  });
});

describe('demo scenario: opt-in QA set', () => {
  it('has long text at the limit, a formula-like description, and a report without photos or address', async () => {
    const { buildQaScenario } = await import('../../demo-data/scenario.mjs');
    const qa = buildQaScenario({ now: DEFAULT_NOW });
    expect(qa.reports).toHaveLength(3);
    expect(qa.reports[0].description).toHaveLength(1000);
    expect(qa.reports[1].description.startsWith('=')).toBe(true);
    expect(qa.reports[2].photos).toHaveLength(0);
    expect(qa.reports[2].addressText).toBeUndefined();
    for (const r of qa.reports) {
      expect(r.id.startsWith('demo-')).toBe(true);
      expect(r.createdAt.getTime()).toBeLessThanOrEqual(nowMs);
    }
  });
});
