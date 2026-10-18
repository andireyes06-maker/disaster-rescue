import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useAuth } from '../../auth/AuthProvider';
import { landingFor } from '../../routes/landing';
import { getFirebaseAuth } from '../../firebase';
import PublicHeader from '../../components/PublicHeader';
import '../../pages/public.css';
import Banner from '../../components/calm/Banner';

// The same message whether or not the address has an account, so the form does not reveal who is registered.
const RESET_SENT = 'If an account exists for that email, a link to set or reset its password has been sent. Check your inbox and spam folder.';

export default function LoginPage() {
  const { user, role, error: authError, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetNote, setResetNote] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  if (user) return <Navigate to={landingFor(role)} replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setResetNote('');
    setBusy(true);
    try {
      await login(email, password);
    } catch {
      setError('Could not sign in. Check your email and password and try again.');
    } finally {
      setBusy(false);
    }
  }

  // Staff are created by a dispatcher or admin without a password (F02). This sends the password-setup
  // email through Firebase Auth, so no credential is shown to anyone and no invitation is created by hand.
  async function onForgotPassword() {
    setError('');
    setResetNote('');
    if (!email.trim()) {
      setError('Enter your email address first, then choose Forgot password.');
      return;
    }
    setResetBusy(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
      setResetNote(RESET_SENT);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/network-request-failed' || code === 'auth/too-many-requests') {
        setError(code === 'auth/too-many-requests'
          ? 'Too many requests. Wait a few minutes, then try again.'
          : 'Could not send the email. Check your connection and try again.');
      } else {
        setResetNote(RESET_SENT);
      }
    } finally {
      setResetBusy(false);
    }
  }

  const message =
    error ||
    (authError === 'account_disabled'
      ? 'This account is disabled. Contact your administrator.'
      : authError === 'auth_failed'
        ? 'We could not sign you in. Check your connection and try again.'
        : '');

  return (
    <div className="login-page">
      <PublicHeader />
      <main className="login">
      <form className="card login__card" onSubmit={onSubmit}>
        <h1>Sign in</h1>
        <p className="login__intro">Staff access for dispatchers, responders, and disaster management officers.</p>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" required value={email}
          onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} />
        {message && <Banner tone="error" role="alert"><span aria-hidden="true">&#9888; </span><strong>Problem:</strong> {message}</Banner>}
        {resetNote && <Banner tone="info" role="status">{resetNote}</Banner>}
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        <button type="button" className="btn btn--ghost" onClick={onForgotPassword} disabled={resetBusy}>
          {resetBusy ? 'Sending...' : 'Forgot password?'}
        </button>
        <p className="login__help">Need an account or help signing in? Contact your team’s dispatcher.</p>
        <p className="login__help">Residents: <Link to="/register">create a resident account</Link>.</p>
      </form>
      <footer className="login__footer">
        <p>Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.</p>
      </footer>
      </main>
    </div>
  );
}
