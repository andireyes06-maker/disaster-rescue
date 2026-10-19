import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import PasswordInput from '../../components/PasswordInput';
import FieldError from '../../components/FieldError';
import MotionForm from '../../components/MotionForm';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../../firebase-auth';
import { api } from '../../api/client';
import { residentSignUpSchema } from '../../lib/schemas';
import { withProvisioning } from '../../auth/provisioning';
import PublicHeader from '../../components/PublicHeader';
import Banner from '../../components/calm/Banner';
import '../../pages/public.css';

function codeOf(err: unknown): string | undefined {
  return (err as { code?: string })?.code;
}

type SignUpField = 'name' | 'email' | 'phone' | 'password' | 'confirmPassword';
const FIELD_ORDER: SignUpField[] = ['name', 'email', 'phone', 'password', 'confirmPassword'];

export default function ResidentSignUp() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SignUpField, string>>>({});
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => { document.title = 'Create a resident account · Rescue Reports'; }, []);

  const set =(field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  const describedBy = (field: SignUpField, hint?: string) =>
    [hint, fieldErrors[field] ? `${field}-error` : undefined].filter(Boolean).join(' ') || undefined;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pendingRef.current) return;
    const parsed = residentSignUpSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Partial<Record<SignUpField, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as SignUpField | undefined;
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      setError('');
      // Focus moves to the first invalid field in page order; values stay as entered.
      const first = FIELD_ORDER.find((k) => errs[k]);
      if (first) document.getElementById(first)?.focus();
      return;
    }
    setFieldErrors({});
    setError('');
    pendingRef.current = true;
    setBusy(true);
    const auth = getFirebaseAuth();
    const { email, password, name, phone } = parsed.data;
    let created = false;
    let signedIn = false;
    let emailTaken = false;
    try {
      // Keeps AuthProvider from signing the new user out before the profile and claims exist.
      await withProvisioning(async () => {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          created = true;
        } catch (err) {
          if (codeOf(err) !== 'auth/email-already-in-use') throw err;
          // Resume: an earlier attempt may have created this account without finishing its profile.
          // Signing in with the password just entered proves it is the same person. A wrong password throws here.
          emailTaken = true;
          await signInWithEmailAndPassword(auth, email, password);
          signedIn = true;
        }
        await api('/users/self', { method: 'POST', body: { name, phone } });
        // Pick up the resident claim the API just set, so the next page sees the right role.
        await auth.currentUser?.getIdToken(true);
      });
      navigate('/my', { replace: true });
    } catch (err) {
      if (emailTaken) {
        // Wrong password, or an existing account that is not a resident: both read as "taken" to the person.
        if (signedIn) await signOut(auth).catch(() => {});
        setFieldErrors({ email: 'An account already uses this email. Sign in instead, or use another email.' });
        document.getElementById('email')?.focus();
      } else if (created) {
        // The identity exists but setup did not finish. Sign out so the next try resumes it with the same details.
        await signOut(auth).catch(() => {});
        setError('Your account was created, but setup did not finish. Try again with the same email and password.');
        document.getElementById('password')?.focus();
      } else {
        setError('Could not create your account. Check your details and try again. If you are in danger, call your emergency hotline now.');
        document.getElementById('password')?.focus();
      }
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <PublicHeader />
      <main className="login auth-split" id="main-content" tabIndex={-1}>
        <MotionForm className="card login__card auth-form" onSubmit={onSubmit} noValidate aria-labelledby="signup-title">
          <h1 id="signup-title">Create a resident account</h1>
          <p className="login__intro">Fill in the details below.</p>
          <RequiredNote />
          <label htmlFor="name">Name<RequiredMark /></label>
          <input id="name" name="name" autoComplete="name" aria-required="true" value={values.name} onChange={set('name')}
            aria-invalid={fieldErrors.name ? true : undefined} aria-describedby={describedBy('name')} />
          {fieldErrors.name && <FieldError id="name-error" className="field-error">{fieldErrors.name}</FieldError>}
          <label htmlFor="email">Email<RequiredMark /></label>
          <input id="email" name="email" type="email" aria-required="true" autoComplete="email" spellCheck={false} value={values.email} onChange={set('email')}
            aria-invalid={fieldErrors.email ? true : undefined} aria-describedby={describedBy('email')} />
          {fieldErrors.email && <FieldError id="email-error" className="field-error">{fieldErrors.email}</FieldError>}
          <label htmlFor="phone">Phone<RequiredMark /></label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" aria-required="true" value={values.phone} onChange={set('phone')}
            aria-invalid={fieldErrors.phone ? true : undefined} aria-describedby={describedBy('phone')} />
          {fieldErrors.phone && <FieldError id="phone-error" className="field-error">{fieldErrors.phone}</FieldError>}
          <label htmlFor="password">Password<RequiredMark /></label>
          <PasswordInput id="password" name="password" autoComplete="new-password" aria-required="true" value={values.password} onChange={set('password')}
            aria-invalid={fieldErrors.password ? true : undefined} aria-describedby={describedBy('password', 'password-hint')} />
          <p id="password-hint" className="field-hint">At least 8 characters.</p>
          {fieldErrors.password && <FieldError id="password-error" className="field-error">{fieldErrors.password}</FieldError>}
          <label htmlFor="confirmPassword">Confirm password<RequiredMark /></label>
          <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" aria-required="true" value={values.confirmPassword} onChange={set('confirmPassword')}
            aria-invalid={fieldErrors.confirmPassword ? true : undefined} aria-describedby={describedBy('confirmPassword')} />
          {fieldErrors.confirmPassword && <FieldError id="confirmPassword-error" className="field-error">{fieldErrors.confirmPassword}</FieldError>}
          {error && <Banner tone="error" role="alert">{error}</Banner>}
          <button type="submit" className="btn" aria-disabled={busy} aria-busy={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
          <p className="login__help">Already registered? <Link to="/login">Sign in</Link></p>
        </MotionForm>
        <aside className="auth-split__intro" aria-labelledby="signup-aside-title">
          <h2 id="signup-aside-title">What you can do</h2>
          <ul className="auth-split__points">
            <li>Send a report with photos and your location.</li>
            <li>Follow each status change on your reports.</li>
            <li>View rounded incident areas on the map.</li>
          </ul>
          <h2>What happens next</h2>
          <ol className="auth-split__steps">
            <li>Your account is created with the details you enter.</li>
            <li>You go straight to your resident page.</li>
          </ol>
          <p className="auth-split__note">If you are in danger, call your local emergency number now. A report does not guarantee immediate rescue.</p>
        </aside>
      </main>
    </div>
  );
}
