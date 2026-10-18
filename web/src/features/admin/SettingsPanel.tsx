import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import MotionForm from '../../components/MotionForm';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import FieldError from '../../components/FieldError';
import Banner from '../../components/calm/Banner';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';

const HOTLINE_MAX = 40;
const NOTICE_MAX = 500;

export default function SettingsPanel() {
  const [attempt, setAttempt] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({ hotline: '', notice: '' });
  const pending = useRef(false);
  const retryFocus = useRef(false);
  const [hotline, setHotline] = useState('');
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setLoaded(false);
    api('/admin/settings')
      .then((res) => {
        const s = res as { hotline: string; residentNotice: string };
        if (!s || typeof s.hotline !== 'string' || typeof s.residentNotice !== 'string') throw new Error('Invalid settings response');
        if (cancelled) return;
        setHotline(s.hotline);
        setNotice(s.residentNotice);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setError('Could not load the settings.'); });
    return () => { cancelled = true; };
  }, [attempt]);
  useEffect(() => {
    if (!retryFocus.current || (!loaded && !error)) return;
    retryFocus.current = false;
    if (document.activeElement !== document.body) return;
    document.getElementById(loaded ? 'hotline' : 'admin-settings-retry')?.focus();
  }, [loaded, error]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!loaded || pending.current) return;
    setSaved(false);
    const h = hotline.trim();
    const n = notice.trim();
    const errors = {
      hotline: !h || h.length > HOTLINE_MAX ? `Hotline is required and at most ${HOTLINE_MAX} characters.` : '',
      notice: !n || n.length > NOTICE_MAX ? `Resident notice is required and at most ${NOTICE_MAX} characters.` : '',
    };
    setFieldErrors(errors);
    if (errors.hotline || errors.notice) { document.getElementById(errors.hotline ? 'hotline' : 'notice')?.focus(); return; }
    pending.current = true;
    setError('');
    setBusy(true);
    try {
      await api('/admin/settings', { method: 'PUT', body: { hotline: h, residentNotice: n } });
      setSaved(true);
    } catch {
      setError('Could not save the settings. Try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (!loaded && !error) return <Skeleton label="Loading admin settings"><SkeletonRows rows={3} height={56} /></Skeleton>;
  return (
    <MotionForm onSubmit={onSubmit} noValidate className="admin-settings">
      <RequiredNote /><label htmlFor="hotline">Hotline number<RequiredMark /></label>
      <input id="hotline" aria-required="true" readOnly={busy} aria-describedby={fieldErrors.hotline ? 'hotline-error hotline-hint' : 'hotline-hint'} aria-invalid={!!fieldErrors.hotline} value={hotline} disabled={!loaded} onChange={(e) => { setHotline(e.target.value); setSaved(false); }} />
      <p id="hotline-hint" className="field-hint">Use a verified emergency contact number for your service area.</p>
      {fieldErrors.hotline && <FieldError id="hotline-error">{fieldErrors.hotline}</FieldError>}
      <label htmlFor="notice">Resident notice<RequiredMark /></label>
      <textarea id="notice" aria-required="true" readOnly={busy} aria-invalid={!!fieldErrors.notice} aria-describedby={fieldErrors.notice ? 'notice-error' : undefined} rows={3} value={notice} disabled={!loaded} onChange={(e) => { setNotice(e.target.value); setSaved(false); }} />
      {fieldErrors.notice && <FieldError id="notice-error">{fieldErrors.notice}</FieldError>}
      {error && <Banner tone="error" role="alert"><span>{error}</span></Banner>}
      {!loaded && error && <button id="admin-settings-retry" type="button" className="btn btn--ghost" onClick={() => { retryFocus.current = true; setAttempt(value => value + 1); }}>Retry settings</button>}
      {saved && <p role="status">Settings saved.</p>}
      <button type="submit" className="btn" disabled={!loaded} aria-disabled={busy} aria-busy={busy}>Save settings</button>
    </MotionForm>
  );
}
