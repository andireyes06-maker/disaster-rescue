import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { landingFor } from '../../routes/landing';
import PublicHeader from '../../components/PublicHeader';
import '../../pages/public.css';
import Banner from '../../components/calm/Banner';

export default function LoginPage() {
  const { user, role, error: authError, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={landingFor(role)} replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
    } catch {
      setError('Could not sign in. Check your email and password and try again.');
    } finally {
      setBusy(false);
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
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
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
