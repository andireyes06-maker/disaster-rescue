import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { within } from '@testing-library/react';

const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', async () => {
  class ApiError extends Error {
    status: number;
    code: string | undefined;
    constructor({ status, code, message }: { status: number; code?: string; message?: string }) {
      super(message || code);
      this.status = status;
      this.code = code;
    }
  }
  return { api: h.api, ApiError };
});
import AssignTeamDialog from './AssignTeamDialog';

import type { Team } from '../../types/domain';

const TEAMS: Team[] = [
  { id: 't1', name: 'Alpha', busy: false, currentReportId: null },
  { id: 't2', name: 'Bravo', busy: true, currentReportId: 'r9' },
  { id: 't3', name: 'Charlie', busy: false, currentReportId: null },
];

function show(teams = TEAMS, reportLocation: { lat: number; lng: number } | null = null) {
  h.api.mockImplementation((path: string) => (path === '/teams' ? Promise.resolve(teams) : Promise.resolve({})));
  return render(<AssignTeamDialog reportId="r1" reportLocation={reportLocation} onClose={vi.fn()} onAssigned={vi.fn()} />);
}

describe('AssignTeamDialog', () => {
  beforeEach(() => { h.api.mockReset(); });

  // The free teams, as checkboxes inside the "Rescue teams" group.
  const teamBoxes = async () => {
    const group = await screen.findByRole('group', { name: /rescue teams/i });
    return within(group).getAllByRole('checkbox');
  };

  it('does not fetch teams while closed and loads them when opened', async () => {
    h.api.mockResolvedValue(TEAMS);
    const view = render(<AssignTeamDialog open={false} reportId="r1" onClose={vi.fn()} />);
    expect(h.api).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<AssignTeamDialog open reportId="r1" onClose={vi.fn()} />);
    expect(await teamBoxes()).toHaveLength(2);
    expect(h.api).toHaveBeenCalledWith('/teams');
  });

  it('lists only non-busy teams', async () => {
    show();
    const labels = (await teamBoxes()).map((b) => b.closest('label')?.textContent);
    expect(labels).toEqual(['Alpha (no headquarters set)', 'Charlie (no headquarters set)']);
    expect(screen.queryByText('Bravo', { exact: false })).toBeNull();
  });

  it('lists the nearest team first, with its distance in km', async () => {
    show(TEAMS.map((t) => ({ ...t, hq: t.id === 't3' ? { lat: 14.6, lng: 120.98 } : { lat: 14.9, lng: 121.2 } })), { lat: 14.6, lng: 120.98 });
    const labels = (await teamBoxes()).map((b) => b.closest('label')?.textContent ?? '');
    expect(labels[0]).toMatch(/^Charlie, 0\.0 km away$/);
    expect(labels[1]).toMatch(/^Alpha, \d+\.\d km away$/);
  });

  it('shows a plain-text reason when no team is free', async () => {
    show(TEAMS.map((t) => ({ ...t, busy: true })));
    expect(await screen.findByText('No rescue teams are free right now. Close a finished rescue to free a team, then try again.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /rescue teams/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /assign team/i })).toBeNull();
  });

  it('refuses to assign when no team is chosen, and sends nothing', async () => {
    show();
    await teamBoxes();
    await userEvent.click(screen.getByRole('button', { name: /assign team/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/choose a free rescue team/i);
    expect(h.api).not.toHaveBeenCalledWith('/reports/r1/assign', expect.anything());
  });

  it('assigns every chosen free team in one request', async () => {
    show();
    const [alpha, charlie] = await teamBoxes();
    await userEvent.click(alpha);
    await userEvent.click(charlie);
    await userEvent.click(screen.getByRole('button', { name: /assign team/i }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/assign', { method: 'POST', body: { teamIds: ['t1', 't3'] } });
  });

  it('a failed team load still offers Close and Try again (W04)', async () => {
    h.api.mockReset().mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce(TEAMS);
    render(<AssignTeamDialog reportId="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load rescue teams/i);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await teamBoxes()).toHaveLength(2);
  });

  it('a team list that never answers still offers Close', () => {
    h.api.mockReset().mockReturnValue(new Promise(() => {}));
    render(<AssignTeamDialog reportId="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading teams/i);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('groups free teams into a tab per identity, and keeps the selection across tabs', async () => {
    show([
      { id: 'p1', name: 'Pnp One', busy: false, currentReportId: null, kind: 'PNP' },
      { id: 'b1', name: 'Bfp One', busy: false, currentReportId: null, kind: 'BFP' },
      { id: 'r1', name: 'Rescue One', busy: false, currentReportId: null, kind: 'Rescue' },
    ]);
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['PNP1', 'BFP1', 'Rescue1', 'MDDRMO0', 'Other0']);
    expect(screen.getByRole('tab', { name: /^PNP/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('checkbox', { name: /Pnp One/ })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Bfp One/ })).toBeNull();
    await userEvent.click(screen.getByRole('checkbox', { name: /Pnp One/ }));
    await userEvent.click(screen.getByRole('tab', { name: /^BFP/ }));
    expect(screen.queryByRole('checkbox', { name: /Pnp One/ })).toBeNull();
    await userEvent.click(screen.getByRole('checkbox', { name: /Bfp One/ }));
    await userEvent.click(screen.getByRole('button', { name: /assign team/i }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/assign', { method: 'POST', body: { teamIds: ['p1', 'b1'] } });
  });
});
