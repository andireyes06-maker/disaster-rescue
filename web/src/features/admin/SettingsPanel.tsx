import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import Banner from '../../components/calm/Banner';

const HOTLINE_MAX = 40;
const NOTICE_MAX = 500;

export default function SettingsPanel() {
  const [hotline, setHotline] = useState('');
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/admin/settings')
      .then((res) => {
        const s = res as { hotline: string; residentNotice: string };
        setHotline(s.hotline);
        setNotice(s.residentNotice);
        setLoaded(true);
      })
      .catch(() => setError('Could not load the settings.'));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    const h = hotline.trim();
    const n = notice.trim();
    if (!h || h.length > HOTLINE_MAX) { setError(`Hotline is required and at most ${HOTLINE_MAX} characters.`); return; }
    if (!n || n.length > NOTICE_MAX) { setError(`Resident notice is required and at most ${NOTICE_MAX} characters.`); return; }
    setError('');
    setBusy(true);
    try {
      await api('/admin/settings', { method: 'PUT', body: { hotline: h, residentNotice: n } });
      setSaved(true);
    } catch {
      setError('Could not save the settings. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="admin-settings">
      <label htmlFor="hotline">Hotline number</label>
      <input id="hotline" value={hotline} disabled={!loaded} onChange={(e) => setHotline(e.target.value)} />
      <label htmlFor="notice">Resident notice</label>
      <textarea id="notice" rows={3} value={notice} disabled={!loaded} onChange={(e) => setNotice(e.target.value)} />
      {error && <Banner tone="error" role="alert"><strong>Problem:</strong> <span>{error}</span></Banner>}
      {saved && <p role="status">Settings saved.</p>}
      <button type="submit" className="btn" disabled={!loaded || busy}>Save settings</button>
    </form>
  );
}
