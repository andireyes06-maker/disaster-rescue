import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ sendPasswordResetEmail: vi.fn() }));
vi.mock('firebase/auth', () => ({ sendPasswordResetEmail: h.sendPasswordResetEmail }));
vi.mock('../../firebase', () => ({ getFirebaseAuth: () => ({ app: 'test-auth' }) }));
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: null, role: null, error: null, login: vi.fn() }),
}));

import LoginPage from './LoginPage';

function renderLogin() {
  return render(<MemoryRouter><LoginPage /></MemoryRouter>);
}

describe('staff password setup from sign-in (F02)', () => {
  beforeEach(() => { h.sendPasswordResetEmail.mockReset().mockResolvedValue(undefined); });

  it('asks for an email before sending anything', () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(h.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter your email address first/)).toBeInTheDocument();
  });

  it('sends the Firebase password email and shows the same confirmation for any address', async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new.staff@x.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    await waitFor(() => expect(h.sendPasswordResetEmail).toHaveBeenCalledWith({ app: 'test-auth' }, 'new.staff@x.test'));
    expect(await screen.findByText(/If an account exists for that email/)).toBeInTheDocument();
  });

  it('shows a retry message when the connection fails', async () => {
    h.sendPasswordResetEmail.mockRejectedValue(Object.assign(new Error('offline'), { code: 'auth/network-request-failed' }));
    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new.staff@x.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(await screen.findByText(/Could not send the email/)).toBeInTheDocument();
  });
});
