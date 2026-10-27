import { describe, it, expect, vi, afterEach } from 'vitest';
import { createMemoryRepo } from '../fakes/memoryRepo.js';
import { listPublicIncidents, PUBLIC_CACHE_MS } from '../../src/services/publicIncidentService.js';

const verified = (repo, lat = 14.8527) => repo.createReport({ type: 'flood', status: 'Verified', location: { lat, lng: 120.8163 } });

describe('listPublicIncidents cache', () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('serves the same answer for 30 seconds without scanning reports again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'));
    const repo = createMemoryRepo();
    const scan = vi.spyOn(repo, 'listRecentReports');
    await verified(repo);
    expect(await listPublicIncidents({ repo })).toHaveLength(1);

    await verified(repo, 14.9);
    vi.setSystemTime(new Date(Date.now() + PUBLIC_CACHE_MS - 1));
    expect(await listPublicIncidents({ repo })).toHaveLength(1);
    expect(scan).toHaveBeenCalledTimes(1);

    vi.setSystemTime(new Date(Date.now() + 1));
    expect(await listPublicIncidents({ repo })).toHaveLength(2);
    expect(scan).toHaveBeenCalledTimes(2);
  });

  it('keeps the privacy shape: no ids, contacts or exact locations', async () => {
    const repo = createMemoryRepo();
    await repo.createReport({ type: 'fire', status: 'Resolved', reporterId: 'u1', contact: { name: 'Ana' }, location: { lat: 14.8527, lng: 120.8163 } });
    const [row] = await listPublicIncidents({ repo });
    expect(Object.keys(row).sort()).toEqual(['center', 'radiusMeters', 'statusCategory', 'type']);
  });

  it('each repo has its own cache, so one app never sees another app answer', async () => {
    const a = createMemoryRepo();
    const b = createMemoryRepo();
    await verified(a);
    expect(await listPublicIncidents({ repo: a })).toHaveLength(1);
    expect(await listPublicIncidents({ repo: b })).toHaveLength(0);
  });
});
