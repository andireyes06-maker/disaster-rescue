import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const authState: { error: string | null } = { error: null };
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: null, role: null, loading: false, error: authState.error, login: vi.fn() }),
}));
vi.mock('firebase/auth', () => ({ sendPasswordResetEmail: vi.fn(async () => undefined) }));
vi.mock('../../firebase', () => ({ getFirebaseAuth: () => ({ auth: true }) }));
import LoginPage from './LoginPage';

describe('LoginPage website access', () => {
  afterEach(() => { authState.error = null; });

  it('tells a dispatcher or DMO that the account has no website access', () => {
    authState.error = 'website_access_disabled';
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('This account has no website access. Ask your administrator.');
    expect(screen.getByRole('alert')).not.toHaveTextContent(/administrators only/i);
  });

  it('tells a resident to use the mobile app', () => {
    authState.error = 'resident_mobile_only';
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Residents use the Rescue Reports mobile app. This account cannot sign in to the website.',
    );
  });
});
