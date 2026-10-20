import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const state = vi.hoisted(() => ({
  auth: {} as Record<string, unknown>,
  retry: vi.fn(),
}));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => state.auth }));

import RoleRoute from './RoleRoute';

const base = { user: { uid: 'ana' }, role: 'responder', loading: false, syncing: false, syncNote: null, retryAvailable: false, retryAccessCheck: () => state.retry() };

describe('RoleRoute while access is being confirmed', () => {
  beforeEach(() => { state.retry.mockReset(); });

  it('hides protected content while the check runs', () => {
    state.auth = { ...base, syncing: true, syncNote: 'auth-sync-pending' };
    render(<MemoryRouter><RoleRoute allow={['responder']}><p>Protected list</p></RoleRoute></MemoryRouter>);
    expect(screen.queryByText('Protected list')).toBeNull();
    expect(screen.getAllByText('Checking your access…').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Retry access check' })).toBeNull();
  });

  it('offers Retry access check once the automatic checks are used up, and moves focus to the panel', () => {
    state.auth = { ...base, syncing: true, syncNote: 'claims-not-updated', retryAvailable: true };
    render(<MemoryRouter><RoleRoute allow={['responder']}><p>Protected list</p></RoleRoute></MemoryRouter>);
    expect(screen.queryByText('Protected list')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Access not confirmed yet' })).toHaveFocus();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('button', { name: 'Retry access check' }));
    expect(screen.getByText(/Your account changed/)).toBeInTheDocument();
    screen.getByRole('button', { name: 'Retry access check' }).click();
    expect(state.retry).toHaveBeenCalledTimes(1);
  });

  it('explains a failed connection and a profile that has not loaded', () => {
    state.auth = { ...base, syncing: true, syncNote: 'refresh-failed', retryAvailable: true };
    const { unmount } = render(<MemoryRouter><RoleRoute allow={['responder']}><p>x</p></RoleRoute></MemoryRouter>);
    expect(screen.getByText(/could not check your access because the connection failed/)).toBeInTheDocument();
    unmount();
    state.auth = { ...base, syncing: true, syncNote: 'profile-loading', retryAvailable: true };
    render(<MemoryRouter><RoleRoute allow={['responder']}><p>x</p></RoleRoute></MemoryRouter>);
    expect(screen.getByText(/could not load your account yet/)).toBeInTheDocument();
  });
});
