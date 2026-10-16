import { useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { checkReportPhotos, webReportSchema } from '../../lib/schemas';
import { REPORT_TYPES } from '../../types/domain';
import Banner from '../../components/calm/Banner';
import SafetyNotice from './SafetyNotice';
import { useHotlines } from './useHotlines';
import '../../pages/public.css';

const TYPE_LABEL: Record<(typeof REPORT_TYPES)[number], string> = {
  flood: 'Flood', fire: 'Fire', earthquake: 'Earthquake', landslide: 'Landslide', other: 'Other',
};
const LOCATION_HINT = 'Pick a location or use GPS before you submit.';

interface Coords { lat: number; lng: number }

export default function ReportForm() {
  const navigate = useNavigate();
  const hotlines = useHotlines();
  const inFlight = useRef(false);
  const [type, setType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function useGps() {
    setError('');
    if (!navigator.geolocation) {
      setError('Location is not available on this device. Try again on a device with GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('Could not get your location. Check that location access is allowed, then try again.'),
    );
  }

  function onPhotos(files: FileList | null) {
    const list = files ? Array.from(files) : [];
    const problem = checkReportPhotos(list);
    setError(problem ?? '');
    setPhotos(problem ? [] : list);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    setError('');

    const parsed = webReportSchema.safeParse({
      type, description, lat: coords?.lat, lng: coords?.lng, source: 'gps', addressText,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? LOCATION_HINT);
      return;
    }
    const photoProblem = checkReportPhotos(photos);
    if (photoProblem) {
      setError(photoProblem);
      return;
    }
    const hasName = contactName.trim() !== '';
    const hasPhone = contactPhone.trim() !== '';
    if (hasName !== hasPhone) {
      setError('Enter both your name and phone number, or leave both empty.');
      return;
    }

    const form = new FormData();
    form.append('type', parsed.data.type);
    form.append('description', parsed.data.description);
    form.append('lat', String(parsed.data.lat));
    form.append('lng', String(parsed.data.lng));
    form.append('source', parsed.data.source);
    if (parsed.data.addressText) form.append('addressText', parsed.data.addressText);
    if (hasName && hasPhone) {
      form.append('contactName', contactName.trim());
      form.append('contactPhone', contactPhone.trim());
    }
    photos.forEach((p) => form.append('photos', p));

    inFlight.current = true;
    setBusy(true);
    try {
      const res = (await api('/reports', { method: 'POST', formData: form })) as { id: string; reference: string };
      navigate(`/my/reports/${res.id}`, { replace: true, state: { reference: res.reference } });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Your report was not sent. Try again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="resident">
      <SafetyNotice hotlines={hotlines} />
      <form className="card report-form" onSubmit={onSubmit} noValidate>
        <section className="report-form__group" aria-labelledby="group-situation">
          <h2 id="group-situation">What is happening</h2>
          <label htmlFor="type">Type of emergency</label>
          <select id="type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Choose a type</option>
            {REPORT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>

          <label htmlFor="description">What is happening?</label>
          <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </section>

        <section className="report-form__group" aria-labelledby="group-location">
          <h2 id="group-location">Where</h2>
          <fieldset className="report-form__location">
            <legend>Location</legend>
            <button type="button" className="btn btn--ghost" onClick={useGps}>Use my location</button>
            <p>{coords ? `Location set (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})` : 'No location set yet.'}</p>
            <label htmlFor="address">Address or landmark</label>
            <input id="address" value={addressText} onChange={(e) => setAddressText(e.target.value)} />
          </fieldset>
        </section>

        <section className="report-form__group" aria-labelledby="group-evidence">
          <h2 id="group-evidence">Photos (optional)</h2>
          <label htmlFor="photos">Photos (up to 5)</label>
          <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => onPhotos(e.target.files)} />
        </section>

        <section className="report-form__group" aria-labelledby="group-contact">
          <h2 id="group-contact">Your contact (optional)</h2>
          <label htmlFor="contactName">Your name (optional)</label>
          <input id="contactName" autoComplete="name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          <label htmlFor="contactPhone">Phone (optional)</label>
          <input id="contactPhone" type="tel" autoComplete="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </section>

        {error && <Banner tone="error" role="alert"><strong>Problem:</strong> <span>{error}</span></Banner>}
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Sending report...' : 'Submit report'}</button>
      </form>
    </main>
  );
}
