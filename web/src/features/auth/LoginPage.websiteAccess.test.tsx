import { describe, it, expect, vi } from 'vitest';
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
  it('tells a dispatcher or DMO that website access is for administrators only', () => {
    authState.error = 'website_access_disabled';
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Website access is for administrators only. Ask your administrator about your access.',
    );
    authState.error = null;
  });
});
