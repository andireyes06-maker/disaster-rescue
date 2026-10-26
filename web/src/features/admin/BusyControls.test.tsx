import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import AccountsPanel from './AccountsPanel';
import UsersPage from '../users/UsersPage';
import TeamsPage from '../teams/TeamsPage';
const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { uid: 'admin-self' } }) }));
vi.mock('../../api/client', () => ({ api: h.api, ApiError: class extends Error {} }));
const account = { uid: 'u1', name: 'Sample Staff', email: 'sample@example.test', role: 'responder', active: true };
const team = { id: 't1', name: 'Sample Team', busy: false };
beforeEach(() => {
  h.api.mockReset();
  h.api.mockImplementation(async (path: string) => path === '/users' ? [account] : [team]);
});
it.each(['account-create', 'role', 'user-create', 'user-status', 'team-create', 'team-rename'])('%s preserves focus and blocks repeats during a failed save', async (kind) => {
  const user = userEvent.setup();
  if (kind.startsWith('account') || kind === 'role') render(<AccountsPanel teams={[team]} />);
  else if (kind.startsWith('user')) render(<UsersPage />);
  else render(<TeamsPage />);
  await screen.findByText(kind.startsWith('team') ? 'Sample Team' : 'Sample Staff');
  let button: HTMLElement;
  if (kind === 'account-create') {
    await user.click(screen.getByText('Create a staff account', { selector: 'summary' }));
    await user.type(screen.getByLabelText('New account name'), 'New Staff');
    await user.type(screen.getByLabelText('New account email'), 'new@example.test');
    await user.type(screen.getByLabelText('New account first password'), 'Harbor-test-2026');
    button = screen.getByRole('button', { name: 'Create account' });
  } else if (kind === 'role') {
    await user.selectOptions(screen.getByLabelText('Role for Sample Staff'), 'admin');
    button = screen.getByRole('button', { name: 'Save role for Sample Staff' });
  } else if (kind === 'user-create') {
    await user.click(screen.getByText('Create staff account', { selector: 'summary' }));
    await user.type(screen.getByLabelText('Email'), 'new@example.test');
    await user.type(screen.getByLabelText('Name'), 'New Staff');
    await user.type(screen.getByLabelText(/First password/), 'Harbor-test-2026');
    button = screen.getByRole('button', { name: 'Create account' });
  } else if (kind === 'user-status') button = screen.getByRole('button', { name: 'Deactivate Sample Staff' });
  else if (kind === 'team-create') {
    await user.click(screen.getByText('Create team', { selector: 'summary' }));
    await user.type(screen.getByLabelText('New team name'), 'New Team');
    button = screen.getByRole('button', { name: 'Create team' });
  } else {
    await user.click(screen.getByText('Edit name'));
    await user.type(screen.getByLabelText('Team name'), ' Updated');
    button = screen.getByRole('button', { name: 'Save name' });
  }
  let reject!: (reason: Error) => void;
  h.api.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
  h.api.mockClear();
  await user.click(button);
  await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'));
  expect(button).toHaveFocus();
  expect(button).toBeEnabled();
  await user.keyboard('{Enter}{Enter}');
  expect(h.api).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('offline')));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(button).toHaveFocus();
  expect(button).toHaveAttribute('aria-disabled', 'false');
});

it('returns focus to the role selector when the saved action disappears', async () => {
  const user = userEvent.setup();
  render(<AccountsPanel teams={[team]} />);
  const select = await screen.findByLabelText('Role for Sample Staff');
  await user.selectOptions(select, 'admin');
  let resolve!: () => void;
  h.api.mockImplementation(() => new Promise<void>(done => { resolve = done; }));
  await user.click(screen.getByRole('button', { name: 'Save role for Sample Staff' }));
  await act(async () => resolve());
  expect(screen.queryByRole('button', { name: 'Save role for Sample Staff' })).not.toBeInTheDocument();
  expect(select).toHaveFocus();
});

it('filters accounts by name and role and restores them from an empty view', async () => {
  const user = userEvent.setup(); render(<UsersPage />);
  await screen.findByText('Sample Staff');
  await user.type(screen.getByRole('searchbox', { name: 'Find an account' }), 'no-match');
  expect(screen.getByRole('heading', { name: 'No matching accounts' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Clear account filters' }));
  expect(screen.getByText('Sample Staff')).toBeInTheDocument();
  expect(screen.getByRole('searchbox', { name: 'Find an account' })).toHaveFocus();
  await user.selectOptions(screen.getByLabelText('Account role'), 'admin');
  expect(screen.getByRole('heading', { name: 'No matching accounts' })).toBeInTheDocument();
});
it('filters teams by availability and recovers from an empty view', async () => {
  const user = userEvent.setup(); render(<TeamsPage />);
  await screen.findByText('Sample Team');
  await user.selectOptions(screen.getByLabelText('Availability'), 'busy');
  expect(screen.getByRole('heading', { name: 'No matching teams' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Clear team filters' }));
  expect(screen.getByText('Sample Team')).toBeInTheDocument();
  expect(screen.getByRole('searchbox', { name: 'Find a team' })).toHaveFocus();
});
it('names the invalid create-account fields and focuses the first without a request', async () => {
  const user = userEvent.setup(); render(<UsersPage />);
  await screen.findByText('Sample Staff');
  await user.click(screen.getByText('Create staff account', { selector: 'summary' }));
  h.api.mockClear();
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true'));
  expect(screen.getByLabelText('Email')).toHaveFocus();
  expect(screen.getByText('Enter a valid email address.')).toHaveAttribute('id', 'staff-email-error');
  expect(h.api).not.toHaveBeenCalled();
});
