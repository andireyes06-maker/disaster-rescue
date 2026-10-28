import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const login = vi.fn();
const authState: { error: string | null } = { error: null };
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: null, role: null, loading: false, error: authState.error, login }),
}));
import LoginPage from './LoginPage';

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
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not sign in/i);
  });

  it('ties the failed sign-in message to the password field', async () => {
    login.mockRejectedValueOnce(new Error('bad'));
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    const alert = await screen.findByRole('alert');
    const password = screen.getByLabelText('Password', { exact: true });
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-describedby', alert.id);
  });

  it('returns focus to the password field after a failed sign-in', async () => {
    login.mockRejectedValueOnce(new Error('bad'));
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await screen.findByRole('alert');
    expect(screen.getByLabelText('Password', { exact: true })).toHaveFocus();
    expect(screen.getByLabelText(/email/i)).toHaveValue('a@b.c');
  });

  it('places the skip link before the header so it is the first stop', () => {
    renderPage();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    const header = document.querySelector('.public-header');
    expect(skip.compareDocumentPosition(header!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows a clear message for auth_failed', () => {
    authState.error = 'auth_failed';
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not sign you in. Check your connection and try again.');
    authState.error = null;
  });

  it('pairs a decorative error sign with the readable account error', async () => {
    authState.error = 'account_disabled';
    renderPage();
    expect(screen.getByRole('alert')).not.toBeEmptyDOMElement();
    expect(screen.getByRole('alert').querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    authState.error = null;
  });

  it('marks empty fields invalid and focuses the first one without calling sign in', async () => {
    login.mockClear();
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Enter your email.')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveFocus();
    expect(login).not.toHaveBeenCalled();
  });

  it('tells residents to use the app, and administrators and rescue teams to use the website', () => {
    renderPage();
    expect(screen.getByText('Residents', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Administrators and rescue teams', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create a resident account' })).toBeNull();
    expect(screen.queryByText('Residents use the I-Report mobile app to send and track reports.')).toBeNull();
  });

  it('treats a malformed email as a field error and does not try to sign in', async () => {
    login.mockClear();
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password', { exact: true }), 'whatever');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByText('Enter an email in the form name@example.com.')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/email/i)).toHaveFocus();
    expect(login).not.toHaveBeenCalled();
  });
});
