import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const login = vi.fn();
const authState: { error: string | null } = { error: null };
vi.mock('../../auth/AuthProvider', () => ({
  useAuth: () => ({ user: null, role: null, loading: false, error: authState.error, login }),
}));
const resetEmail = vi.fn<(auth: unknown, email: string) => Promise<void>>(async () => undefined);
vi.mock('firebase/auth', () => ({ sendPasswordResetEmail: (auth: unknown, email: string) => resetEmail(auth, email) }));
vi.mock('../../firebase-auth', () => ({ getFirebaseAuth: () => ({ auth: true }) }));
const apiCall = vi.fn<(path: string, init?: unknown) => Promise<unknown>>(async () => undefined);
vi.mock('../../api/client', () => ({ api: (path: string, init?: unknown) => apiCall(path, init) }));
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

const NEUTRAL = 'If an account uses this email, a password reset link will be sent.';
const HELP_SENT = 'Your request was sent. An administrator will send you a reset link.';
const helpCalls = () => apiCall.mock.calls.filter(([path]) => path === '/auth/reset-help');

describe('LoginPage password recovery', () => {
  beforeEach(() => { resetEmail.mockReset(); resetEmail.mockImplementation(async () => undefined); apiCall.mockReset(); apiCall.mockImplementation(async () => undefined); });

  it('asks for a valid email before sending a reset link, and sends nothing', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/email/i)).toHaveFocus();
    expect(resetEmail).not.toHaveBeenCalled();
  });

  it('treats a malformed email the same way for the reset link', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(resetEmail).not.toHaveBeenCalled();
  });

  it('sends one Firebase reset email and shows the neutral message', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), ' person@example.com ');
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(await screen.findByRole('status')).toHaveTextContent(NEUTRAL);
    expect(resetEmail).toHaveBeenCalledTimes(1);
    expect(resetEmail).toHaveBeenCalledWith({ auth: true }, 'person@example.com');
  });

  it('shows the same neutral message when Firebase knows no such account', async () => {
    resetEmail.mockRejectedValueOnce(Object.assign(new Error('nope'), { code: 'auth/user-not-found' }));
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'nobody@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(await screen.findByRole('status')).toHaveTextContent(NEUTRAL);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sends nothing more on a second click while the reset link is pending', async () => {
    let finish: () => void = () => undefined;
    resetEmail.mockImplementationOnce(() => new Promise<void>((done) => { finish = done; }));
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'person@example.com');
    const button = screen.getByRole('button', { name: 'Forgot password?' });
    await userEvent.click(button);
    const busy = screen.getByRole('button', { name: 'Requesting link…' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(busy);
    expect(resetEmail).toHaveBeenCalledTimes(1);
    finish();
    expect(await screen.findByRole('status')).toHaveTextContent(NEUTRAL);
  });

  it('shows an inline error when the reset link cannot reach the network', async () => {
    resetEmail.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'auth/network-request-failed' }));
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'person@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not connect. Check your internet and try again.');
    expect(screen.getByRole('button', { name: 'Forgot password?' })).toBeInTheDocument();
  });

  it('asks for the email first before contacting an admin, and sends nothing', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Contact an admin to reset it' }));
    expect(screen.getByText('Enter your email above, then choose Contact an admin.')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/email/i)).toHaveFocus();
    expect(helpCalls()).toHaveLength(0);
  });

  it('posts one help request and says an administrator will send a link', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'person@example.com');
    const button = screen.getByRole('button', { name: 'Contact an admin to reset it' });
    await userEvent.click(button);
    expect(await screen.findByRole('status')).toHaveTextContent(HELP_SENT);
    expect(helpCalls()).toEqual([['/auth/reset-help', { method: 'POST', body: { email: 'person@example.com' } }]]);
  });

  it('sends nothing more on a second click while the help request is pending', async () => {
    let finish: () => void = () => undefined;
    apiCall.mockImplementation((path) => path === '/auth/reset-help' ? new Promise((done) => { finish = () => done({ ok: true }); }) : Promise.resolve(undefined));
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'person@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Contact an admin to reset it' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sending request…' }));
    expect(helpCalls()).toHaveLength(1);
    finish();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(HELP_SENT));
  });

  it('shows an inline error, not a crash, when the help request fails', async () => {
    apiCall.mockImplementation(async (path) => { if (path === '/auth/reset-help') throw new TypeError('Failed to fetch'); return undefined; });
    renderPage();
    await userEvent.type(screen.getByLabelText(/email/i), 'person@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Contact an admin to reset it' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not send your request. Check your internet and try again.');
    expect(screen.getByRole('button', { name: 'Contact an admin to reset it' })).toBeInTheDocument();
  });
});
