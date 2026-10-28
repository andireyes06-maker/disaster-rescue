import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import PasswordInput from '../../components/PasswordInput';
import FieldError from '../../components/FieldError';
import MotionForm from '../../components/MotionForm';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { landingFor } from '../../routes/landing';
import { api } from '../../api/client';
import PublicHeader from '../../components/PublicHeader';
import '../../pages/public.css';
import Banner from '../../components/calm/Banner';

type LoginField = 'email' | 'password';
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_ORDER: LoginField[] = ['email', 'password'];
// The API counts failed sign-ins per email (5 failures, 5 minutes) and this page honours the lock. The lock is
// advisory: Firebase Auth itself is not blocked, so only Firebase's own throttling stops a direct guess. See api/src/routes/auth.js.
interface LockState { locked: boolean; retryAfterSeconds: number }

const lockedMessage = (seconds: number) => {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
};

export default function LoginPage() {
  const { user, role, error: authError, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => { document.title = 'Sign in · I-Report'; }, []);

  if (user) return <Navigate to={landingFor(role)} replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pendingRef.current) return;
    const errs: Partial<Record<LoginField, string>> = {};
    if (!email.trim()) errs.email = 'Enter your email.';
    else if (!EMAIL_SHAPE.test(email.trim())) errs.email = 'Enter an email in the form name@example.com.';
    if (!password) errs.password = 'Enter your password.';
    setFieldErrors(errs);
    setError('');
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    pendingRef.current = true;
    setBusy(true);
    const emailValue = email.trim();
    try {
      // If the lock check cannot reach the API, sign-in still goes ahead; the API still counts the failures.
      const lock = await api('/auth/sign-in/check', { method: 'POST', body: { email: emailValue } }).then((r) => r as LockState).catch(() => null);
      if (lock?.locked) {
        setError(lockedMessage(lock.retryAfterSeconds));
        return;
      }
      await login(email, password);
      // Clears the count. Needs the new session's token; a failure here does not block the sign-in.
      await api('/auth/sign-in/success', { method: 'POST', body: {} }).catch(() => undefined);
    } catch {
      const failed = await api('/auth/sign-in/failure', { method: 'POST', body: { email: emailValue } }).then((r) => r as LockState).catch(() => null);
      if (failed?.locked) {
        setError(lockedMessage(failed.retryAfterSeconds));
      } else {
        setError('Could not sign in. Check your email and password and try again.');
      }
      // Return to the field the person can correct after a failed sign-in.
      document.getElementById('password')?.focus();
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  const message =
    error ||
    (authError === 'account_disabled'
      ? 'This account is disabled. Contact your administrator.'
      : authError === 'website_access_disabled'
        ? 'This account has no website access. Ask your administrator.'
      : authError === 'resident_mobile_only'
        ? 'Residents use the I-Report mobile app. This account cannot sign in to the website.'
      : authError === 'auth_failed'
        ? 'We could not sign you in. Check your connection and try again.'
        : authError === 'session_ended'
          ? 'Your access changed, so your session ended. Sign in again to continue.'
          : '');

  return (
    <div className="login-page">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <PublicHeader />
      <main className="login auth-split" id="main-content" tabIndex={-1}>
        <MotionForm className="card login__card auth-form" onSubmit={onSubmit} noValidate aria-labelledby="login-title">
          <h1 id="login-title">Sign in</h1>
          <RequiredNote />
          <label htmlFor="email">Email<RequiredMark /></label>
          <input id="email" name="email" type="email" aria-required="true" autoComplete="username" spellCheck={false} value={email}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            onChange={(e) => setEmail(e.target.value)} />
          {fieldErrors.email && <FieldError id="email-error" className="field-error">{fieldErrors.email}</FieldError>}
          <label htmlFor="password">Password<RequiredMark /></label>
          <PasswordInput id="password" name="password" autoComplete="current-password" aria-required="true" value={password}
            aria-invalid={fieldErrors.password || error ? true : undefined}
            aria-describedby={fieldErrors.password ? 'password-error' : error ? 'login-error' : undefined}
            onChange={(e) => setPassword(e.target.value)} />
          {fieldErrors.password && <FieldError id="password-error" className="field-error">{fieldErrors.password}</FieldError>}
          {message && <Banner id="login-error" tone="error" role="alert">{message}</Banner>}
          <button type="submit" className="btn" aria-disabled={busy} aria-busy={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </MotionForm>
        <aside className="auth-split__intro" aria-labelledby="login-aside-title">
          <h2 id="login-aside-title">Who signs in here</h2>
          <ul className="auth-split__points">
            <li><strong>Residents</strong> use the I-Report mobile app.</li>
            <li><strong>Administrators and rescue teams</strong> use the account an administrator created for them, here or in the mobile app.</li>
          </ul>
          <p className="auth-split__note">Administrator accounts are created by an administrator. Use your registered email address and password to sign in.</p>
          <p className="auth-split__note">Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.</p>
        </aside>
      </main>
    </div>
  );
}
