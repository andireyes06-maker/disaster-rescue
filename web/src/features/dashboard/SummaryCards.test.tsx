import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../firebase', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) }));
import SummaryCards from './SummaryCards';

const STATS = { total: 12, open: 5, resolved: 7, byType: {}, byStatus: {}, perDay: [] };
const TEAMS = [{ id: 't1', name: 'A', busy: false }, { id: 't2', name: 'B', busy: true }, { id: 't3', name: 'C', busy: false }];

beforeEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(String(url).includes('/stats') ? STATS : TEAMS),
  })) as unknown as typeof fetch;
});

describe('SummaryCards', () => {
  it('shows the four numbers from the stats response and the team count', async () => {
    render(<SummaryCards />);
    const value = async (label: string) => (await screen.findByText(label)).parentElement;
    expect(await value('Total reports')).toHaveTextContent('12');
    expect(await value('Ongoing')).toHaveTextContent('5');
    expect(await value('Resolved')).toHaveTextContent('7');
    expect(await value('Rescue teams')).toHaveTextContent('3');
  });
});
