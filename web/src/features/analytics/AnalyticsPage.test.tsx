import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

vi.mock('../../firebase-auth', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) }));
import AnalyticsPage from './AnalyticsPage';

const STATS = {
  total: 3,
  open: 2,
  resolved: 1,
  byType: { flood: 2, fire: 1 },
  byStatus: { Submitted: 2, Resolved: 1 },
  perDay: [{ date: '2026-01-01', count: 2 }, { date: '2026-01-02', count: 1 }],
};
const EMPTY = { total: 0, open: 0, resolved: 0, byType: {}, byStatus: {}, perDay: [] };

function serveStats(body: unknown) {
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch;
}

function Probe() {
  const loc = useLocation();
  return <output data-testid="search">{loc.search}</output>;
}

function renderPage(path = '/analytics') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AnalyticsPage />
      <Probe />
    </MemoryRouter>,
  );
}

describe('AnalyticsPage', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('rejects a reversed date interval instead of showing misleading empty charts or allowing exports', () => {
    serveStats(STATS);
    renderPage('/analytics?from=2026-10-17&to=2026-10-01');
    expect(screen.getByRole('alert')).toHaveTextContent('The end date must be on or after the start date.');
    expect(screen.getByLabelText('To')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('button', { name: 'Download CSV' })).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('shows the empty state and no chart when there is no data', async () => {
    serveStats(EMPTY);
    renderPage();
    await waitFor(() => expect(screen.getAllByText(/no data for this range/i)).toHaveLength(3));
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('writes the type filter into the query string', async () => {
    serveStats(STATS);
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'flood');
    expect(screen.getByTestId('search')).toHaveTextContent('type=flood');
  });

  it('sends the type filter to the stats request so every number is filtered', async () => {
    serveStats(STATS);
    renderPage();
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'flood');
    await waitFor(() => {
      const urls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('/stats?') && u.includes('type=flood'))).toBe(true);
    });
  });

  it('gives each chart card a text table with one row per data point', async () => {
    serveStats(STATS);
    renderPage();
    const byType = await screen.findByRole('table', { name: /incidents by type/i });
    expect(byType.querySelectorAll('tbody tr')).toHaveLength(2);
    const byStatus = screen.getByRole('table', { name: /incidents by status/i });
    expect(byStatus.querySelectorAll('tbody tr')).toHaveLength(2);
    const perDay = screen.getByRole('table', { name: /incidents per day/i });
    expect(within(perDay).getByText('2026-01-02')).toBeInTheDocument();
    expect(perDay.querySelectorAll('tbody tr')).toHaveLength(2);
  });
  it('does not present a malformed response as zero incidents', async () => {
    serveStats({}); renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load analytics.');
    expect(screen.queryByText('Reports in this period')).not.toBeInTheDocument();
  });

});
