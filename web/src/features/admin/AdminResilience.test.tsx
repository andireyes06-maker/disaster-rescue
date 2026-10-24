import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', () => ({ api: h.api, ApiError: class extends Error {} }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { uid: 'admin-self' }, role: 'admin' }) }));
vi.mock('../audit/AuditPage', () => ({ default: () => <p>Audit sample</p> }));
import AccountsPanel from './AccountsPanel';
import SettingsPanel from './SettingsPanel';
import AdminPage from './AdminPage';
import TeamsPanel from './TeamsPanel';
const sample = { uid: 'u1', name: 'Sample Staff', email: 'sample@example.test', role: 'responder', active: true };
it('keeps a filtered team visible while its name is being edited and preserves drafts across search', async () => {
  const user = userEvent.setup();
  render(<TeamsPanel teams={[{ id: 'alpha', name: 'Harbor Alpha' }]} onChange={vi.fn()} />);
  await user.type(screen.getByRole('searchbox', { name: 'Find a team' }), 'Alpha');
  const name = screen.getByLabelText('Name of Harbor Alpha');
  await user.clear(name);
  await user.type(name, 'Renamed team');
  expect(name).toHaveValue('Renamed team');
  await user.clear(screen.getByRole('searchbox', { name: 'Find a team' }));
  await user.type(screen.getByRole('searchbox', { name: 'Find a team' }), 'No match');
  await user.click(screen.getByRole('button', { name: 'Clear team search' }));
  expect(screen.getByLabelText('Name of Harbor Alpha')).toHaveValue('Renamed team');
  expect(screen.getByRole('searchbox', { name: 'Find a team' })).toHaveFocus();
});
beforeEach(() => { h.api.mockReset().mockImplementation(async (path: string) => path === '/users' ? [sample] : path === '/admin/settings' ? { hotline: '000-0000', residentNotice: 'Demo notice' } : path === '/admin/health' ? { api: 'ok', firestore: 'ok', checkedAt: '2026-10-17T00:00:00Z' } : []); });
it('keeps account creation success separate from a failed list refresh', async () => {
  let reads = 0;
  h.api.mockImplementation(async (path: string, options?: { method: string }) => {
    if (options?.method === 'POST') return { uid: 'new-staff' };
    if (path === '/users' && reads++ === 0) return [sample];
    throw new Error('refresh unavailable');
  });
  const user = userEvent.setup(); render(<AccountsPanel teams={[]} />);
  await screen.findByText('Sample Staff');
  await user.click(screen.getByText('Create a staff account', { selector: 'summary' }));
  await user.type(screen.getByLabelText('New account name'), 'New Staff');
  await user.type(screen.getByLabelText('New account email'), 'new@example.test');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByText('Staff account created.')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('account list could not be refreshed');
  expect(screen.queryByText(/Could not create the account/)).not.toBeInTheDocument();
});
it('offers recovery for a failed team load instead of rendering an empty editor', async () => {
  let reads = 0;
  h.api.mockImplementation(async (path: string) => {
    if (path === '/teams') { if (reads++ === 0) throw new Error('offline'); return [{ id: 't1', name: 'Recovered Team' }]; }
    if (path === '/users') return [sample];
    if (path === '/admin/settings') return { hotline: '', residentNotice: '' };
    return { api: 'ok', firestore: 'ok', checkedAt: '2026-10-17T00:00:00Z' };
  });
  const user = userEvent.setup(); render(<MemoryRouter><AdminPage /></MemoryRouter>);
  await user.click(screen.getByText('Teams', { selector: 'h2' }));
  await user.click(await screen.findByRole('button', { name: 'Retry teams' }));
  expect(await screen.findByLabelText('Name of Recovered Team')).toBeInTheDocument();
});
it('removes the settings saved message when the draft changes', async () => {
  const user = userEvent.setup(); render(<SettingsPanel />);
  await waitFor(() => expect(screen.getByLabelText('Resident notice')).toHaveValue('Demo notice'));
  await user.click(screen.getByRole('button', { name: 'Save settings' }));
  await screen.findByText('Settings saved.');
  await user.type(screen.getByLabelText('Resident notice'), ' changed');
  expect(screen.queryByText('Settings saved.')).not.toBeInTheDocument();
});
it('keeps settings values stable while saving and blocks repeated submits', async () => {
  const user = userEvent.setup(); render(<SettingsPanel />);
  await waitFor(() => expect(screen.getByLabelText('Resident notice')).toHaveValue('Demo notice'));
  let done!: () => void;
  h.api.mockImplementation(() => new Promise<void>(resolve => { done = resolve; }));
  h.api.mockClear();
  const save = screen.getByRole('button', { name: 'Save settings' });
  await user.click(save);
  expect(save).toHaveFocus();
  expect(screen.getByLabelText('Resident notice')).toHaveAttribute('readonly');
  await user.keyboard('{Enter}{Enter}');
  expect(h.api).toHaveBeenCalledTimes(1);
  await act(async () => done());
});

it('explains the self-role restriction without offering a save action', async () => {
  render(<AccountsPanel teams={[]} currentUid="u1" />);
  expect(await screen.findByLabelText('Role for Sample Staff')).toBeDisabled();
  expect(screen.getByText('Your account. Another administrator must change your role.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save role for Sample Staff' })).not.toBeInTheDocument();
});
it('preserves an unrecognized current role rather than displaying a different role', async () => {
  h.api.mockResolvedValue([{ ...sample, role: 'guest' }]);
  render(<AccountsPanel teams={[]} />);
  expect(await screen.findByLabelText('Role for Sample Staff')).toHaveValue('guest');
});
it('returns focus to search when a role update removes a row from the selected filter', async () => {
  const user = userEvent.setup(); render(<AccountsPanel teams={[]} />);
  const role = await screen.findByLabelText('Role for Sample Staff');
  await user.selectOptions(screen.getByLabelText('Filter by role'), 'responder');
  await user.selectOptions(role, 'admin');
  await user.click(screen.getByRole('button', { name: 'Save role for Sample Staff' }));
  await screen.findByText('Role updated for Sample Staff.');
  expect(screen.getByRole('searchbox', { name: 'Find an account' })).toHaveFocus();
  expect(screen.queryByLabelText('Role for Sample Staff')).not.toBeInTheDocument();
});
it('treats an invalid settings response as a load failure with retry', async () => {
  h.api.mockResolvedValue({}); render(<SettingsPanel />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the settings.');
  expect(screen.getByRole('button', { name: 'Retry settings' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
});

it('retries a pending access update even when the stored role has not changed', async () => {
  h.api.mockResolvedValue([{ ...sample, authSyncPending: true }]);
  const user = userEvent.setup(); render(<AccountsPanel teams={[]} />);
  await user.click(await screen.findByRole('button', { name: 'Retry access update for Sample Staff' }));
  expect(h.api).toHaveBeenCalledWith('/users/u1', { method: 'PATCH', body: { role: 'responder' } });
  await screen.findByText('Role updated for Sample Staff.');
  expect(screen.queryByRole('button', { name: 'Retry access update for Sample Staff' })).not.toBeInTheDocument();
});

it('places a taken-email error on Email and preserves the account draft', async () => {
  const user = userEvent.setup(); render(<AccountsPanel teams={[]} />);
  await screen.findByText('Sample Staff');
  await user.click(screen.getByText('Create a staff account', { selector: 'summary' }));
  await user.type(screen.getByLabelText('New account name'), 'New Staff');
  await user.type(screen.getByLabelText('New account email'), 'used@example.test');
  h.api.mockRejectedValue(Object.assign(new Error('taken'), { status: 409, code: 'email_taken' }));
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('That email already has an account.');
  expect(screen.getByLabelText('New account email')).toHaveFocus();
  expect(screen.getByLabelText('New account name')).toHaveValue('New Staff');
});
