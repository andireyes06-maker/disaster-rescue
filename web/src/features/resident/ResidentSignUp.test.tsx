import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({
  createUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  api: vi.fn(),
  getIdToken: vi.fn(),
}));
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: h.createUser,
  signInWithEmailAndPassword: h.signIn,
  signOut: h.signOut,
}));
vi.mock('../../firebase-auth', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: h.getIdToken } }) }));
vi.mock('../../api/client', () => ({ api: h.api }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: null, role: null, error: null, login: vi.fn() }) }));

import ResidentSignUp from './ResidentSignUp';

function renderPage() {
  return render(<MemoryRouter><ResidentSignUp /></MemoryRouter>);
}

async function fill(user: ReturnType<typeof userEvent.setup>, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) {
    await user.type(screen.getByLabelText(label), value);
  }
}

describe('ResidentSignUp', () => {
  beforeEach(() => {
    h.createUser.mockReset().mockResolvedValue({ user: { uid: 'res-1' } });
    h.api.mockReset().mockResolvedValue({ created: true, uid: 'res-1', role: 'resident' });
    h.getIdToken.mockReset().mockResolvedValue('token');
    h.signIn.mockReset().mockResolvedValue({ user: { uid: 'res-1' } });
    h.signOut.mockReset().mockResolvedValue(undefined);
  });

  it('refuses mismatched passwords without creating an account', async () => {
    const user = userEvent.setup();
    renderPage();
    await fill(user, { Name: 'Ana Cruz', Email: 'ana@example.com', Phone: '0917 000 0001', Password: 'correct-horse-1', 'Confirm password': 'different-horse-2' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(h.createUser).not.toHaveBeenCalled();
  });

  it('creates the Firebase account, then registers the resident with the API', async () => {
    const user = userEvent.setup();
    renderPage();
    await fill(user, { Name: 'Ana Cruz', Email: 'ana@example.com', Phone: '0917 000 0001', Password: 'correct-horse-1', 'Confirm password': 'correct-horse-1' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(h.createUser).toHaveBeenCalledWith(expect.anything(), 'ana@example.com', 'correct-horse-1');
    expect(h.api).toHaveBeenCalledWith('/users/self', expect.objectContaining({
      method: 'POST',
      body: { name: 'Ana Cruz', phone: '0917 000 0001' },
    }));
    expect(h.getIdToken).toHaveBeenCalledWith(true);
  });

  it('ties a taken email to the Email field and focuses it', async () => {
    h.createUser.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/email-already-in-use' }));
    h.signIn.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/invalid-credential' }));
    const user = userEvent.setup();
    renderPage();
    await fill(user, { Name: 'Ana Cruz', Email: 'ana@example.com', Phone: '0917 000 0001', Password: 'correct-horse-1', 'Confirm password': 'correct-horse-1' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/already uses this email/)).toHaveAttribute('id', 'email-error');
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(h.api).not.toHaveBeenCalled();
  });

  it('shows the failure message and the hotline when account creation fails', async () => {
    h.createUser.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/email-already-exists' }));
    const user = userEvent.setup();
    renderPage();
    await fill(user, { Name: 'Ana Cruz', Email: 'ana@example.com', Phone: '0917 000 0001', Password: 'correct-horse-1', 'Confirm password': 'correct-horse-1' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/Could not create your account/)).toBeInTheDocument();
    expect(screen.getByText(/emergency hotline/)).toBeInTheDocument();
    expect(h.api).not.toHaveBeenCalled();
  });

  it('marks each invalid field, ties its message, and focuses the first invalid field on empty submit', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    const name = screen.getByLabelText('Name');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAttribute('aria-describedby', 'name-error');
    expect(screen.getByText('Enter your name.')).toHaveAttribute('id', 'name-error');
    expect(name).toHaveFocus();
    expect(screen.queryByText(/^Problem:/)).not.toBeInTheDocument();
    expect(h.createUser).not.toHaveBeenCalled();
  });

  it('keeps the password hint linked and clears an error once the field is valid', async () => {
    const user = userEvent.setup();
    renderPage();
    await fill(user, { Name: 'Ana Cruz', Email: 'ana@example.com', Phone: '0917 000 0001', Password: 'short' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('aria-describedby', 'password-hint password-error');
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
  });

  it('resumes an interrupted sign-up: an existing account signs in with the same password, then the profile is written', async () => {
    h.createUser.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/email-already-in-use' }));
    const user = userEvent.setup();
    renderPage();
    await fill(user, { Name: 'Ana Cruz', Email: 'ana@example.com', Phone: '0917 000 0001', Password: 'correct-horse-1', 'Confirm password': 'correct-horse-1' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(h.signIn).toHaveBeenCalledWith(expect.anything(), 'ana@example.com', 'correct-horse-1');
    expect(h.api).toHaveBeenCalledWith('/users/self', expect.objectContaining({ method: 'POST' }));
    expect(h.signOut).not.toHaveBeenCalled();
  });

  it('treats a wrong password on an existing email as a taken email, and signs nothing in', async () => {
    h.createUser.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/email-already-in-use' }));
    h.signIn.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'auth/invalid-credential' }));
    const user = userEvent.setup();
    renderPage();
    await fill(user, { Name: 'Ana Cruz', Email: 'ana@example.com', Phone: '0917 000 0001', Password: 'correct-horse-1', 'Confirm password': 'correct-horse-1' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/already uses this email/)).toHaveAttribute('id', 'email-error');
    expect(h.api).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps a retry path when setup fails after the account exists, and signs the half-finished session out', async () => {
    h.api.mockRejectedValueOnce(new Error('network'));
    const user = userEvent.setup();
    renderPage();
    await fill(user, { Name: 'Ana Cruz', Email: 'ana@example.com', Phone: '0917 000 0001', Password: 'correct-horse-1', 'Confirm password': 'correct-horse-1' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText(/setup did not finish/)).toBeInTheDocument();
    expect(h.signOut).toHaveBeenCalled();
  });
});
