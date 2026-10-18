import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', () => ({ api: h.api }));

import UsersPage from './UsersPage';

const users = [
  { uid: 'u-resp', email: 'ana@x.test', name: 'Ana', role: 'responder', active: true, team: null },
  { uid: 'u-res', email: 'resident@x.test', name: 'Res', role: 'resident', active: true, team: null },
];
const teams = [{ id: 'tA', name: 'Team A' }];

describe('UsersPage team assignment (F03)', () => {
  beforeEach(() => {
    h.api.mockReset().mockImplementation(async (path: string) => {
      if (path === '/users') return users;
      if (path === '/teams') return teams;
      return { uid: 'u-resp', team: 'tA' };
    });
  });

  it('a responder without a team can be linked to one, through the API', async () => {
    render(<UsersPage />);
    const select = await screen.findByRole('combobox', { name: 'Team for Ana' });
    fireEvent.change(select, { target: { value: 'tA' } });
    await waitFor(() => expect(h.api).toHaveBeenCalledWith('/users/u-resp', { method: 'PATCH', body: { team: 'tA' } }));
    expect(await screen.findByText('Team assigned.')).toBeInTheDocument();
  });

  it('residents have no team control', async () => {
    render(<UsersPage />);
    await screen.findByRole('combobox', { name: 'Team for Ana' });
    expect(screen.queryByRole('combobox', { name: 'Team for Res' })).toBeNull();
  });
});
