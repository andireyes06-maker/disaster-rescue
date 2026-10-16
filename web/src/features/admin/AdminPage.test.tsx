import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ api: vi.fn(), routes: {} as Record<string, unknown> }));
vi.mock('../../api/client', () => ({ api: h.api }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { uid: 'adm-1', email: 'admin@x.test' }, role: 'admin' }) }));
vi.mock('../audit/AuditPage', () => ({ default: () => <p>audit entries</p> }));

import AdminPage from './AdminPage';

const USERS = [
  { uid: 'd1', name: 'Jose Reyes', email: 'dispatcher@x.test', role: 'dispatcher', active: true },
  { uid: 'r1', name: 'Ana Cruz', email: 'responder@x.test', role: 'responder', active: true, team: 'team-alpha' },
];

function routeTo(path: string, opts?: { method?: string; body?: unknown }) {
  const key = `${opts?.method ?? 'GET'} ${path}`;
  if (key in h.routes) return h.routes[key];
  if (key === 'GET /admin/health') return { api: 'ok', firestore: 'ok', checkedAt: '2026-10-16T00:00:00Z' };
  if (key === 'GET /admin/settings') return { hotline: '000-0000', residentNotice: 'A report does not guarantee rescue.' };
  if (key === 'GET /users') return USERS;
  if (key === 'GET /teams') return [{ id: 'team-alpha', name: 'Team Alpha', busy: false }];
  if (key.startsWith('PUT /admin/settings')) return opts?.body;
  if (key === 'POST /users') return { uid: 'new-1', role: (opts?.body as { role: string }).role };
  if (key === 'POST /teams') return { id: 'team-bravo' };
  return {};
}

function renderPage() {
  return render(<MemoryRouter><AdminPage /></MemoryRouter>);
}

describe('AdminPage', () => {
  beforeEach(() => {
    h.routes = {};
    h.api.mockReset().mockImplementation(async (path: string, opts?: { method?: string; body?: unknown }) => routeTo(path, opts));
  });

  it('has the four sections: accounts, teams, system and settings, audit and exports', async () => {
    renderPage();
    for (const name of ['Accounts and roles', 'Teams', 'System health and settings', 'Audit and exports']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });

  it('shows the API and database status', async () => {
    renderPage();
    expect(await screen.findByText('API: ok')).toBeInTheDocument();
    expect(screen.getByText('Database: ok')).toBeInTheDocument();
  });

  it('loads the hotline and notice, and refuses a notice over 500 characters before saving', async () => {
    const user = userEvent.setup();
    renderPage();
    const notice = await screen.findByLabelText('Resident notice');
    expect(notice).toHaveValue('A report does not guarantee rescue.');
    await user.clear(notice);
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(h.api).not.toHaveBeenCalledWith('/admin/settings', expect.objectContaining({ method: 'PUT' }));
    await user.type(notice, 'x'.repeat(501));
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('Resident notice is required and at most 500 characters.')).toBeInTheDocument();
  });

  it('lists the accounts with their roles', async () => {
    renderPage();
    const row = (await screen.findByText('Ana Cruz')).closest('tr') as HTMLElement;
    expect(within(row).getByText('responder')).toBeInTheDocument();
  });

  it('creates an admin account when the role is set to admin', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Ana Cruz');
    await user.type(screen.getByLabelText('New account name'), 'Second Admin');
    await user.type(screen.getByLabelText('New account email'), 'second@x.test');
    await user.selectOptions(screen.getByLabelText('New account role'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(h.api).toHaveBeenCalledWith('/users', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ email: 'second@x.test', name: 'Second Admin', role: 'admin' }),
    }));
  });

  it('lists teams and creates a new one', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Team Alpha')).toBeInTheDocument();
    await user.type(screen.getByLabelText('New team name'), 'Team Bravo');
    await user.click(screen.getByRole('button', { name: 'Create team' }));
    expect(h.api).toHaveBeenCalledWith('/teams', expect.objectContaining({ method: 'POST', body: { name: 'Team Bravo' } }));
  });

  it('changes an account role from its row', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = (await screen.findByText('Ana Cruz')).closest('tr') as HTMLElement;
    await user.selectOptions(within(row).getByLabelText('Role for Ana Cruz'), 'dmo');
    expect(h.api).toHaveBeenCalledWith('/users/r1', expect.objectContaining({ method: 'PATCH', body: { role: 'dmo' } }));
  });

  it('renames a team from its row', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = await screen.findByLabelText('Name of Team Alpha');
    await user.clear(input);
    await user.type(input, 'Team Alfa');
    await user.click(screen.getByRole('button', { name: 'Save name for Team Alpha' }));
    expect(h.api).toHaveBeenCalledWith('/teams/team-alpha', expect.objectContaining({ method: 'PATCH', body: { name: 'Team Alfa' } }));
  });

  it('shows the audit log, and no export button (exports carry exact locations)', async () => {
    renderPage();
    expect(screen.getByText('audit entries')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download summary (PDF)' })).toBeNull();
  });
});
