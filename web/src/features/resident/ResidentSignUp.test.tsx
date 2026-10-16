import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({
  createUser: vi.fn(),
  api: vi.fn(),
  getIdToken: vi.fn(),
}));
vi.mock('firebase/auth', () => ({ createUserWithEmailAndPassword: h.createUser }));
vi.mock('../../firebase', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: h.getIdToken } }) }));
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
});
