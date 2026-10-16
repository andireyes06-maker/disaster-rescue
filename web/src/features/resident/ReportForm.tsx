import { useEffect, useRef, useState, type FormEvent } from 'react';
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

// Field keys in page order. Each maps to the element that receives focus for that field (W09).
type FieldKey = 'type' | 'description' | 'location' | 'photos' | 'contact';
const FIELD_ORDER: FieldKey[] = ['type', 'description', 'location', 'photos', 'contact'];
const FIELD_FOCUS: Record<FieldKey, string> = {
  type: 'type', description: 'description', location: 'address', photos: 'photos', contact: 'contactName',
};
const FIELD_LABEL: Record<FieldKey, string> = {
  type: 'Type of emergency', description: 'What is happening', location: 'Location', photos: 'Photos', contact: 'Your contact',
};
type FieldErrors = Partial<Record<FieldKey, string>>;

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [focusKey, setFocusKey] = useState<FieldKey | null>(null);
  const [busy, setBusy] = useState(false);

  // Unsaved entries are warned about on reload or closing the tab (W10). They are not written to storage:
  // the report has sensitive contact details and photos, and no retention policy has been approved for them.
  const dirty = description.trim() !== '' || addressText.trim() !== '' || type !== '' || coords !== null
    || photos.length > 0 || contactName.trim() !== '' || contactPhone.trim() !== '';
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // After a failed submit, move focus to the first invalid field. Values stay as entered.
  useEffect(() => {
    if (!focusKey) return;
    document.getElementById(FIELD_FOCUS[focusKey])?.focus();
    setFocusKey(null);
  }, [focusKey]);

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
    const errs: FieldErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = String(issue.path[0] ?? '');
        const key: FieldKey = path === 'type' ? 'type' : path === 'description' ? 'description' : 'location';
        errs[key] ??= issue.message;
      }
    }
    const photoProblem = checkReportPhotos(photos);
    if (photoProblem) errs.photos = photoProblem;
    const hasName = contactName.trim() !== '';
    const hasPhone = contactPhone.trim() !== '';
    if (hasName !== hasPhone) errs.contact = 'Enter both your name and phone number, or leave both empty.';
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setFocusKey(FIELD_ORDER.find((k) => errs[k]) ?? null);
      return;
    }
    setFieldErrors({});
    if (!parsed.success) return;

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
          <select id="type" value={type} onChange={(e) => setType(e.target.value)}
            aria-invalid={fieldErrors.type ? true : undefined} aria-describedby={fieldErrors.type ? 'type-error' : undefined}>
            <option value="">Choose a type</option>
            {REPORT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
          {fieldErrors.type && <p id="type-error" className="field-error">{fieldErrors.type}</p>}

          <label htmlFor="description">What is happening?</label>
          <textarea id="description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)}
            aria-invalid={fieldErrors.description ? true : undefined} aria-describedby={fieldErrors.description ? 'description-error' : undefined} />
          {fieldErrors.description && <p id="description-error" className="field-error">{fieldErrors.description}</p>}
        </section>

        <section className="report-form__group" aria-labelledby="group-location">
          <h2 id="group-location">Where</h2>
          <fieldset className="report-form__location">
            <legend>Location</legend>
            <button type="button" className="btn btn--ghost" onClick={useGps}>Use my location</button>
            <p>{coords ? `Location set (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})` : 'No location set yet.'}</p>
            {fieldErrors.location && <p id="location-error" className="field-error">{fieldErrors.location}</p>}
            <label htmlFor="address">Address or landmark</label>
            <input id="address" value={addressText} onChange={(e) => setAddressText(e.target.value)}
              aria-invalid={fieldErrors.location ? true : undefined} aria-describedby={fieldErrors.location ? 'location-error' : undefined} />
          </fieldset>
        </section>

        <section className="report-form__group" aria-labelledby="group-evidence">
          <h2 id="group-evidence">Photos (optional)</h2>
          <label htmlFor="photos">Photos (up to 5)</label>
          <input id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => onPhotos(e.target.files)}
            aria-invalid={fieldErrors.photos ? true : undefined} aria-describedby={fieldErrors.photos ? 'photos-error' : undefined} />
          {fieldErrors.photos && <p id="photos-error" className="field-error">{fieldErrors.photos}</p>}
        </section>

        <section className="report-form__group" aria-labelledby="group-contact">
          <h2 id="group-contact">Your contact (optional)</h2>
          <label htmlFor="contactName">Your name (optional)</label>
          {fieldErrors.contact && <p id="contact-error" className="field-error">{fieldErrors.contact}</p>}
          <input id="contactName" autoComplete="name" value={contactName} onChange={(e) => setContactName(e.target.value)}
            aria-invalid={fieldErrors.contact ? true : undefined} aria-describedby={fieldErrors.contact ? 'contact-error' : undefined} />
          <label htmlFor="contactPhone">Phone (optional)</label>
          <input id="contactPhone" type="tel" autoComplete="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
            aria-invalid={fieldErrors.contact ? true : undefined} aria-describedby={fieldErrors.contact ? 'contact-error' : undefined} />
        </section>

        <p className="report-form__note">Your entries stay on this page until you submit or leave it. They are not saved on this device.</p>
        {Object.keys(fieldErrors).length > 0 && (
          <Banner tone="error" role="alert">
            <strong>Fix these fields to submit:</strong>
            <ul className="error-summary">
              {FIELD_ORDER.filter((k) => fieldErrors[k]).map((k) => (
                <li key={k}><a href={`#${FIELD_FOCUS[k]}`}>{FIELD_LABEL[k]}</a>: {fieldErrors[k]}</li>
              ))}
            </ul>
          </Banner>
        )}
        {error && <Banner tone="error" role="alert"><strong>Problem:</strong> <span>{error}</span></Banner>}
        <button type="submit" className="btn" disabled={busy}>{busy ? 'Sending report...' : 'Submit report'}</button>
      </form>
    </main>
  );
}
