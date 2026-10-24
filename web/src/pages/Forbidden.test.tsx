import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const authState: { user: unknown; role: string | null } = { user: null, role: null };
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ user: authState.user, role: authState.role, loading: false, error: null, login: vi.fn(), logout: vi.fn() }),
}));
import Forbidden from './Forbidden';

const renderPage = () => render(<MemoryRouter><Forbidden /></MemoryRouter>);

describe('Forbidden', () => {
  it('tells a signed-in resident to use the mobile app, with no website page link', () => {
    for (const role of ['resident']) {
      authState.user = { uid: 'r1' };
      authState.role = role;
      const { unmount } = render(<MemoryRouter><Forbidden /></MemoryRouter>);
      expect(screen.getByText('Residents use the Rescue Reports mobile app. The website is for administrators and rescue teams.')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Go to my page' })).not.toBeInTheDocument();
      unmount();
    }
  });

  it('explains an unrecognized role without offering a page', () => {
    authState.user = { uid: 'g1' };
    authState.role = 'guest';
    renderPage();
    expect(screen.getByText(/its role is not one this app recognizes/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Go to my page' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('asks a signed-out visitor to sign in', () => {
    authState.user = null;
    authState.role = null;
    renderPage();
    expect(screen.getByText('This page needs a signed-in account. Sign in with the account that has access to it.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });
});
