import { describe, it, expect } from 'vitest';
import { listPublicIncidents, PUBLIC_MAX_INCIDENTS } from '../../src/services/publicIncidentService.js';

describe('the public map is bounded to the most recent incidents', () => {
  it('asks the repository for at most the public bound', async () => {
    const seen = [];
    const repo = { listRecentReportsByStatus: async (statuses, limit) => { seen.push({ statuses, limit }); return []; } };
    await listPublicIncidents({ repo });
    expect(seen).toEqual([{ statuses: ['Verified', 'Awaiting Assignment', 'Team Assigned', 'Rescue in Progress', 'Resolved'], limit: PUBLIC_MAX_INCIDENTS }]);
  });
});
