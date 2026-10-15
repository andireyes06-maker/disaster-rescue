import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const login = vi.fn();
vi.mock('../../auth/AuthProvider.jsx', () => ({
  useAuth: () => ({ user: null, role: null, loading: false, error: null, login }),
}));
import LoginPage from './LoginPage.jsx';

const renderPage = () => render(<MemoryRouter><LoginPage /></MemoryRouter>);

describe('LoginPage', () => {
  it('shows the disclaimer', () => {
    renderPage();
    expect(
      screen.getByText(
        'Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.',
      ),
    ).toBeInTheDocument();
  });

  it('shows an error on failed login', async () => {
    login.mockRejectedValueOnce(new Error('bad'));
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not sign in/i);
  });
});
