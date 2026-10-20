import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

const TEAMS = [
  { id: 't1', name: 'Alpha', busy: false, currentReportId: null },
  { id: 't2', name: 'Bravo', busy: true, currentReportId: 'r9' },
  { id: 't3', name: 'Charlie', busy: false, currentReportId: null },
];

function show(teams = TEAMS) {
  h.api.mockImplementation((path: string) => (path === '/teams' ? Promise.resolve(teams) : Promise.resolve({})));
  return render(<AssignTeamDialog reportId="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
}

describe('AssignTeamDialog', () => {
  beforeEach(() => { h.api.mockReset(); });

  it('does not fetch teams while closed and loads them when opened', async () => {
    h.api.mockResolvedValue(TEAMS);
    const view = render(<AssignTeamDialog open={false} reportId="r1" onClose={vi.fn()} />);
    expect(h.api).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    view.rerender(<AssignTeamDialog open reportId="r1" onClose={vi.fn()} />);
    expect(await screen.findByRole('combobox', { name: /rescue team/i })).toBeInTheDocument();
    expect(h.api).toHaveBeenCalledWith('/teams');
  });

  it('lists only non-busy teams', async () => {
    show();
    const select = await screen.findByRole('combobox', { name: /rescue team/i });
    const options = within(select).getAllByRole('option').filter((o) => (o as HTMLOptionElement).value).map((o) => o.textContent);
    expect(options).toEqual(['Alpha', 'Charlie']);
    expect(within(select).queryByText('Bravo')).toBeNull();
  });

  it('shows a plain-text reason when no team is free', async () => {
    show(TEAMS.map((t) => ({ ...t, busy: true })));
    expect(await screen.findByText('No rescue teams are free right now. Close a finished rescue to free a team, then try again.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /rescue team/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /assign team/i })).toBeNull();
  });

  it.each([['busy team', 't2'], ['unknown team', 'ghost']])('rejects a %s selection client-side', async (_label, teamId) => {
    show();
    const select = await screen.findByRole('combobox', { name: /rescue team/i });
    const forged = document.createElement('option');
    forged.value = teamId;
    forged.textContent = 'Forged';
    select.appendChild(forged);
    (select as HTMLSelectElement).value = teamId;
    await userEvent.click(screen.getByRole('button', { name: /assign team/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/choose a free rescue team/i);
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(select).toHaveAttribute('aria-describedby', 'assign-error');
    expect(h.api).not.toHaveBeenCalledWith('/reports/r1/assign', expect.anything());
  });

  it('assigns the chosen free team', async () => {
    show();
    const select = await screen.findByRole('combobox', { name: /rescue team/i });
    await userEvent.selectOptions(select, 't3');
    await userEvent.click(screen.getByRole('button', { name: /assign team/i }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/assign', { method: 'POST', body: { teamId: 't3' } });
  });

  it('a failed team load still offers Close and Try again (W04)', async () => {
    h.api.mockReset().mockRejectedValueOnce(new Error('503')).mockResolvedValueOnce(TEAMS);
    render(<AssignTeamDialog reportId="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load rescue teams/i);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('combobox', { name: /rescue team/i })).toBeInTheDocument();
  });

  it('a team list that never answers still offers Close', () => {
    h.api.mockReset().mockReturnValue(new Promise(() => {}));
    render(<AssignTeamDialog reportId="r1" onClose={vi.fn()} onAssigned={vi.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent(/loading teams/i);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
