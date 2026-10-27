import { useRef, useState, type FormEvent } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getFirebaseAuth } from '../../firebase-auth';

const MIN_LENGTH = 10;

// Lets the person who is signed in change their own password. Firebase asks for the current one first.
export default function ChangePassword() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  function close() {
    dialog.current?.close();
    setCurrent('');
    setNext('');
    setConfirm('');
    setMessage(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (next.length < MIN_LENGTH) {
      setMessage({ kind: 'error', text: `The new password needs at least ${MIN_LENGTH} characters.` });
      return;
    }
    if (next !== confirm) {
      setMessage({ kind: 'error', text: 'The new passwords do not match.' });
      return;
    }
    const user = getFirebaseAuth().currentUser;
    if (!user?.email) {
      setMessage({ kind: 'error', text: 'Sign in again, then change your password.' });
      return;
    }
    setBusy(true);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current));
      await updatePassword(user, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setMessage({ kind: 'ok', text: 'Your password has been changed.' });
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      const text = code === 'auth/wrong-password' || code === 'auth/invalid-credential'
        ? 'The current password is not correct.'
        : code === 'auth/weak-password'
          ? 'Choose a stronger password.'
          : code === 'auth/requires-recent-login'
            ? 'Sign out and sign in again, then change your password.'
            : 'Could not change the password. Try again.';
      setMessage({ kind: 'error', text });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="btn btn--ghost" onClick={() => dialog.current?.showModal()}>Change password</button>
      <dialog ref={dialog} aria-labelledby="change-password-title" className="change-password" onClose={close}>
        <form onSubmit={submit} noValidate className="change-password__form">
          <h2 id="change-password-title">Change your password</h2>
          <label htmlFor="cp-current">Current password</label>
          <input id="cp-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          <label htmlFor="cp-next">New password (at least {MIN_LENGTH} characters)</label>
          <input id="cp-next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
          <label htmlFor="cp-confirm">Repeat the new password</label>
          <input id="cp-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {message && <p role="status" className={message.kind === 'error' ? 'field-error' : 'field-hint'}>{message.text}</p>}
          <div className="actions__row">
            <button type="button" className="btn btn--ghost" onClick={close}>Close</button>
            <button type="submit" className="btn" disabled={busy} aria-busy={busy}>{busy ? 'Saving…' : 'Save password'}</button>
          </div>
        </form>
      </dialog>
    </>
  );
}
