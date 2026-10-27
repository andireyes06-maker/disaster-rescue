import { describe, it, expect } from 'vitest';
import { listPublicIncidents, PUBLIC_MAX_INCIDENTS } from '../../src/services/publicIncidentService.js';

describe('the public map is bounded to the most recent incidents', () => {
  it('asks the repository for at most the public bound', async () => {
    const seen = [];
    const repo = { listRecentReports: async (limit) => { seen.push(limit); return []; } };
    await listPublicIncidents({ repo });
    expect(seen).toEqual([PUBLIC_MAX_INCIDENTS]);
  });
});
