import { describe, it, expect } from 'vitest';
import { coarsen, projectReportForRole } from '../../src/domain/privacy.js';
const r = { id: 'r1', type: 'flood', status: 'Verified', priority: 'high', reporterId: 'u1', assignedTeamId: 't1',
  location: { lat: 14.8527, lng: 120.8163 }, coarseLocation: { lat: 14.855, lng: 120.815 },
  contact: { name: 'Ana', phone: '0917' }, createdAt: 1 };
describe('privacy', () => {
  it('coarsen rounds to 0.005', () => { expect(coarsen(14.8527, 120.8163)).toEqual({ lat: 14.855, lng: 120.815 }); });
  it('admin sees everything', () => { expect(projectReportForRole(r, 'admin', 'a1')).toEqual(r); });
  it('dispatcher and dmo get only the public projection (they have no API access anyway)', () => {
    for (const role of ['dispatcher', 'dmo']) {
      const p = projectReportForRole(r, role, 'd1');
      expect(p.contact).toBeUndefined(); expect(p.location).toBeUndefined();
    }
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
  const withReporter = { id: 'r1', status: 'Team Assigned', reporterId: 'u1', reporterName: 'x', reporterPhone: '1', reporterPhotoUrl: 'https://p', assignedTeamId: 't' };
  it('responder projection drops reporter name, phone and photo', () => {
    const p = projectReportForRole(withReporter, 'responder', 'rsp-1', 't');
    expect(p).not.toBeNull();
    for (const k of ['reporterName', 'reporterPhone', 'reporterPhotoUrl']) expect(p).not.toHaveProperty(k);
  });
  it('admin projection keeps reporter name, phone and photo', () => {
    const p = projectReportForRole(withReporter, 'admin', 'a1');
    expect(p).toMatchObject({ reporterName: 'x', reporterPhone: '1', reporterPhotoUrl: 'https://p' });
  });
});
