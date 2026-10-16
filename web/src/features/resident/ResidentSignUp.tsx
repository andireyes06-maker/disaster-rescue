import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '../../firebase';
import { api } from '../../api/client';
import { residentSignUpSchema } from '../../lib/schemas';
import PublicHeader from '../../components/PublicHeader';
import Banner from '../../components/calm/Banner';
import '../../pages/public.css';

export default function ResidentSignUp() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const parsed = residentSignUpSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const { email, password, name, phone } = parsed.data;
      await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
      await api('/users/self', { method: 'POST', body: { name, phone } });
      // Pick up the resident claim the API just set, so the next page sees the right role.
      await getFirebaseAuth().currentUser?.getIdToken(true);
      navigate('/my', { replace: true });
    } catch {
      setError('Could not create your account. Check your details and try again. If you are in danger, call your emergency hotline now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <PublicHeader />
      <main className="login">
        <form className="card login__card" onSubmit={onSubmit} noValidate>
          <h1>Create a resident account</h1>
          <p className="login__intro">Report an emergency and follow your reports from one place.</p>
          <label htmlFor="name">Name</label>
          <input id="name" autoComplete="name" value={values.name} onChange={set('name')} />
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={values.email} onChange={set('email')} />
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" value={values.password} onChange={set('password')} />
          <label htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" type="password" autoComplete="new-password" value={values.confirmPassword} onChange={set('confirmPassword')} />
          {error && <Banner tone="error" role="alert"><span aria-hidden="true">&#9888; </span><strong>Problem:</strong> {error}</Banner>}
          <button type="submit" className="btn" disabled={busy}>{busy ? 'Creating account...' : 'Create account'}</button>
          <p className="login__help">Already registered? <Link to="/login">Sign in</Link></p>
        </form>
      </main>
    </div>
  );
}
