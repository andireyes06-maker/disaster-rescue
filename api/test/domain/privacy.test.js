import { describe, it, expect } from 'vitest';
import { coarsen, projectReportForRole } from '../../src/domain/privacy.js';
const r = { id: 'r1', type: 'flood', status: 'Verified', priority: 'high', reporterId: 'u1', assignedTeamId: 't1',
  location: { lat: 14.8527, lng: 120.8163 }, coarseLocation: { lat: 14.855, lng: 120.815 },
  contact: { name: 'Ana', phone: '0917' }, createdAt: 1 };
describe('privacy', () => {
  it('coarsen rounds to 0.005', () => { expect(coarsen(14.8527, 120.8163)).toEqual({ lat: 14.855, lng: 120.815 }); });
  it('dispatcher and dmo see everything', () => {
    expect(projectReportForRole(r, 'dispatcher', 'd1')).toEqual(r);
    expect(projectReportForRole(r, 'dmo', 'm1')).toEqual(r);
  });
  it('reporter sees own report fully', () => { expect(projectReportForRole(r, 'resident', 'u1')).toEqual(r); });
  it('assigned responder sees it, other team does not', () => {
    expect(projectReportForRole(r, 'responder', 'x', 't1')).toEqual(r);
    expect(projectReportForRole(r, 'responder', 'x', 't2')).toBeNull();
  });
  it('other resident gets public projection without contact or exact location', () => {
    const p = projectReportForRole(r, 'resident', 'u2');
    expect(p).toEqual({ id: 'r1', type: 'flood', status: 'Verified', priority: 'high', coarseLocation: r.coarseLocation, createdAt: 1 });
    expect(p.contact).toBeUndefined(); expect(p.location).toBeUndefined();
  });
  it('other resident gets null for unverified reports', () => {
    expect(projectReportForRole({ ...r, status: 'Submitted' }, 'resident', 'u2')).toBeNull();
  });
});
