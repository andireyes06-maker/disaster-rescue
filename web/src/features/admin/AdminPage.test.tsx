import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    expect(await screen.findByText('API: Available')).toBeInTheDocument();
    expect(screen.getByText('Database: Available')).toBeInTheDocument();
  });

  it('loads the hotline and notice, and refuses a notice over 500 characters before saving', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('System health and settings', { selector: 'h2' }));
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
    await user.click(screen.getByText('Create a staff account', { selector: 'summary' }));
    await user.type(screen.getByLabelText('New account name'), 'Second Admin');
    await user.type(screen.getByLabelText('New account email'), 'second@x.test');
    await user.selectOptions(screen.getByLabelText('New account role'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(h.api).toHaveBeenCalledWith('/users', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ email: 'second@x.test', name: 'Second Admin', role: 'admin' }),
    })));
  });

  it('lists teams and creates a new one', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Teams', { selector: 'h2' }));
    expect(await screen.findByRole('textbox', { name: 'Name of Team Alpha' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('New team name'), 'Team Bravo');
    await user.click(screen.getByRole('button', { name: 'Create team' }));
    await waitFor(() => expect(h.api).toHaveBeenCalledWith('/teams', expect.objectContaining({ method: 'POST', body: { name: 'Team Bravo' } })));
  });

  it('changes an account role from its row', async () => {
    const user = userEvent.setup();
    renderPage();
    const row = (await screen.findByText('Ana Cruz')).closest('tr') as HTMLElement;
    await user.selectOptions(within(row).getByLabelText('Role for Ana Cruz'), 'admin');
    // Staged: nothing is sent until the admin saves the change (W11).
    expect(h.api).not.toHaveBeenCalledWith('/users/r1', expect.objectContaining({ method: 'PATCH' }));
    await user.click(within(row).getByRole('button', { name: 'Save role for Ana Cruz' }));
    expect(h.api).toHaveBeenCalledWith('/users/r1', expect.objectContaining({ method: 'PATCH', body: { role: 'admin' } }));
  });

  it("shows each account's current role in its row", async () => {
    renderPage();
    const row = (await screen.findByText('Ana Cruz')).closest('tr') as HTMLElement;
    expect(within(row).getByLabelText('Role for Ana Cruz')).toHaveValue('responder');
  });

  it('renames a team from its row', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Teams', { selector: 'h2' }));
    const input = await screen.findByLabelText('Name of Team Alpha');
    await user.clear(input);
    await user.type(input, 'Team Alfa');
    await user.click(screen.getByRole('button', { name: 'Save name for Team Alpha' }));
    await waitFor(() => expect(h.api).toHaveBeenCalledWith('/teams/team-alpha', expect.objectContaining({ method: 'PATCH', body: { name: 'Team Alfa' } })));
  });

  it('shows the audit log, and no export button (exports carry exact locations)', async () => {
    renderPage();
    expect(screen.getByText('audit entries')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download summary (PDF)' })).toBeNull();
  });
  it('recovers a failed health check without reloading the page', async () => {
    let failed = false;
    h.api.mockImplementation(async (path: string, opts?: { method?: string; body?: unknown }) => {
      if (path === '/admin/health' && !failed) { failed = true; throw new Error('offline'); }
      return routeTo(path, opts);
    });
    const user = userEvent.setup(); renderPage();
    await user.click(screen.getByText('System health and settings', { selector: 'h2' }));
    await user.click(await screen.findByRole('button', { name: 'Retry health check' }));
    expect(await screen.findByText('API: Available')).toBeInTheDocument();
  });

  // Dispatcher and DMO accounts have no website access: an admin cannot give those roles, but an existing record still shows its role.
  it('offers only responder and admin for new accounts and role changes, and still shows an existing dispatcher', async () => {
    renderPage();
    const existing = await screen.findByLabelText('Role for Jose Reyes');
    expect(existing).toHaveValue('dispatcher');
    const offered = within(existing).queryAllByRole('option').map((o) => o.textContent);
    expect(offered).toEqual(['dispatcher', 'responder', 'admin']);
    const ana = await screen.findByLabelText('Role for Ana Cruz');
    expect(within(ana).queryAllByRole('option').map((o) => o.textContent)).toEqual(['responder', 'admin']);
    const newRole = screen.getByLabelText('New account role');
    expect(within(newRole).queryAllByRole('option').map((o) => o.textContent)).toEqual(['responder', 'admin']);
  });

});
