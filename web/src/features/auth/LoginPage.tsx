import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import PasswordInput from '../../components/PasswordInput';
import FieldError from '../../components/FieldError';
import MotionForm from '../../components/MotionForm';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { landingFor } from '../../routes/landing';
import { api } from '../../api/client';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFirebaseAuth } from '../../firebase-auth';
import PublicHeader from '../../components/PublicHeader';
import '../../pages/public.css';
import Banner from '../../components/calm/Banner';

type LoginField = 'email' | 'password';
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_ORDER: LoginField[] = ['email', 'password'];
// The API counts failed sign-ins per email (5 failures, 5 minutes) and this page honours the lock. The lock is
// advisory: Firebase Auth itself is not blocked, so only Firebase's own throttling stops a direct guess. See api/src/routes/auth.js.
interface LockState { locked: boolean; retryAfterSeconds: number }

// The same wording as the phone (mobile/lib/features/auth/login_page.dart), so both apps say one thing.
const RESET_SENT = 'If an account uses this email, a password reset link will be sent.';
const HELP_SENT = 'Your request was sent. An administrator will send you a reset link.';
const isNetworkFailure = (e: unknown) => (e as { code?: unknown } | null)?.code === 'auth/network-request-failed';

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
  const [resetting, setResetting] = useState(false);
  const [contacting, setContacting] = useState(false);
  const resettingRef = useRef(false);
  const contactingRef = useRef(false);
  const [recoveryNotice, setRecoveryNotice] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

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

  // Both recovery actions need a usable email first. Returns it, or marks the email field and returns null.
  function recoveryEmail(invalidMessage: string): string | null {
    const value = email.trim();
    setRecoveryNotice('');
    setRecoveryError('');
    setError('');
    if (!EMAIL_SHAPE.test(value)) {
      setFieldErrors({ email: invalidMessage });
      document.getElementById('email')?.focus();
      return null;
    }
    setFieldErrors({});
    return value;
  }

  // Firebase sends its own reset email. Any answer other than a network failure gets the same neutral
  // message, so the page never tells anyone whether an account uses this email.
  async function onForgotPassword() {
    if (resettingRef.current || pendingRef.current) return;
    const value = recoveryEmail('Enter a valid email address.');
    if (!value) return;
    resettingRef.current = true;
    setResetting(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), value);
      setRecoveryNotice(RESET_SENT);
    } catch (e) {
      if (isNetworkFailure(e)) setRecoveryError('Could not connect. Check your internet and try again.');
      else setRecoveryNotice(RESET_SENT);
    } finally {
      resettingRef.current = false;
      setResetting(false);
    }
  }

  // Asks the administrators for help; they send the reset from the website. The API answers the same for any address.
  async function onContactAdmin() {
    if (contactingRef.current || pendingRef.current) return;
    const value = recoveryEmail('Enter your email above, then choose Contact an admin.');
    if (!value) return;
    contactingRef.current = true;
    setContacting(true);
    try {
      await api('/auth/reset-help', { method: 'POST', body: { email: value } });
      setRecoveryNotice(HELP_SENT);
    } catch {
      setRecoveryError('Could not send your request. Check your internet and try again.');
    } finally {
      contactingRef.current = false;
      setContacting(false);
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
      <main className="login auth-split auth-split--signin" id="main-content" tabIndex={-1}>
        <MotionForm className="card login__card auth-form" onSubmit={onSubmit} noValidate aria-labelledby="login-title">
          <p className="auth-form__eyebrow">Staff website</p>
          <h1 id="login-title">Sign in</h1>
          <p className="login__intro">For administrators and rescue teams. Use the email and password from your account.</p>
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
          <section className="login__recovery" aria-labelledby="login-recovery-title">
            <h2 id="login-recovery-title">Need a password?</h2>
            <p className="login__recovery-help">Enter your email above to set or reset your password.</p>
            <div className="login__recovery-actions">
              <button type="button" className="btn btn--ghost" onClick={onForgotPassword}
                aria-disabled={resetting || busy} aria-busy={resetting}>{resetting ? 'Requesting link…' : 'Forgot password?'}</button>
              <button type="button" className="login__recovery-link" onClick={onContactAdmin}
                aria-disabled={contacting || busy} aria-busy={contacting}>{contacting ? 'Sending request…' : 'Contact an admin to reset it'}</button>
            </div>
            <div role="status" aria-atomic="true">
              {recoveryNotice && <p className="login__recovery-notice">{recoveryNotice}</p>}
            </div>
            {recoveryError && <Banner id="login-recovery-error" tone="error" role="alert">{recoveryError}</Banner>}
          </section>
        </MotionForm>
        <aside className="auth-split__intro" aria-labelledby="login-aside-title">
          <img className="auth-split__logo" src="/brand/ireport-logo-dark.png" alt="" aria-hidden="true" width="160" height="45" />
          <h2 id="login-aside-title">Who signs in here</h2>
          <ul className="auth-split__points">
            <li><strong>Administrators and rescue teams</strong> use this website with the account an administrator created for them.</li>
            <li><strong>Residents</strong> use the I-Report mobile app on their phone to send reports and follow updates.</li>
          </ul>
          <p className="auth-split__note">New staff accounts are created by an administrator. There is no sign-up on the website.</p>
          <p className="auth-split__note auth-split__note--safety">Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.</p>
        </aside>
      </main>
    </div>
  );
}
