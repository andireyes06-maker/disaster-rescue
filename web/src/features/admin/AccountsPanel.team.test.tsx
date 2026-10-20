import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', () => ({ api: h.api }));

import AccountsPanel from './AccountsPanel';

const users = [
  { uid: 'u-resp', name: 'Ana Cruz', email: 'ana@x.test', role: 'responder', active: true, team: 'team-alpha' },
  { uid: 'u-res', name: 'Maria Santos', email: 'maria@x.test', role: 'resident', active: true },
];
const teams = [{ id: 'team-alpha', name: 'Team Alpha' }, { id: 'team-bravo', name: 'Team Bravo' }];

describe('admin accounts team control (F03, audit Finding 8)', () => {
  beforeEach(() => {
    h.api.mockReset().mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (path === '/users' && !opts) return users;
      return { uid: 'u-resp', team: 'team-bravo' };
    });
  });

  it('a responder can be moved to another team from the accounts table', async () => {
    render(<AccountsPanel teams={teams} />);
    const select = await screen.findByRole('combobox', { name: 'Team for Ana Cruz' });
    expect(select).toHaveValue('team-alpha');
    fireEvent.change(select, { target: { value: 'team-bravo' } });
    await waitFor(() => expect(h.api).toHaveBeenCalledWith('/users/u-resp', { method: 'PATCH', body: { team: 'team-bravo' } }));
    expect(await screen.findByText('Team assigned for Ana Cruz.')).toBeInTheDocument();
  });

  it('residents show no team control', async () => {
    render(<AccountsPanel teams={teams} />);
    await screen.findByRole('combobox', { name: 'Team for Ana Cruz' });
    expect(screen.queryByRole('combobox', { name: 'Team for Maria Santos' })).toBeNull();
  });
});
