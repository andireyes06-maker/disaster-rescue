import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import FieldError from '../../components/FieldError';
import MotionForm from '../../components/MotionForm';
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { Waves, Flame, Mountain, Building2, CircleHelp, MapPin, LocateFixed, Camera, Send, UserRound, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import { checkReportPhotos, webReportSchema } from '../../lib/schemas';
import { REPORT_TYPES } from '../../types/domain';
import Banner from '../../components/calm/Banner';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import SafetyNotice from './SafetyNotice';
import { useHotlines } from './useHotlines';
import '../../pages/public.css';
import './resident-motion.css';

const TYPE_LABEL: Record<(typeof REPORT_TYPES)[number], string> = {
  flood: 'Flood', fire: 'Fire', earthquake: 'Earthquake', landslide: 'Landslide', other: 'Other',
};
const LOCATION_HINT = 'Pick a location or use GPS before you submit.';
const TYPE_ICON = { flood: Waves, fire: Flame, earthquake: Building2, landslide: Mountain, other: CircleHelp };
const ReportLocationMap = lazy(() => import('./ReportLocationMap'));

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

// Keys must match the API's 16 to 100 character pattern for letters, digits, hyphens and underscores.
function newSubmissionKey(): string {
  return globalThis.crypto.randomUUID();
}

export default function ReportForm() {
  const navigate = useNavigate();
  const hotlines = useHotlines();
  const inFlight = useRef(false);
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const photoIdentities = useRef(new WeakMap<File, string>());
  const [type, setType] = useState<string>('');
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationSource, setLocationSource] = useState<'gps' | 'manual'>('gps');
  const [mapOpen, setMapOpen] = useState(true);
  const [locating, setLocating] = useState(false);
  const locatingRef = useRef(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
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
    if (locatingRef.current) return;
    setError('');
    if (!navigator.geolocation) {
      setError('Location is not available on this device. Try again on a device with GPS.');
      return;
    }
    locatingRef.current = true;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationSource('gps'); locatingRef.current = false; setLocating(false); },
      () => { locatingRef.current = false; setLocating(false); setError('Could not get your location. Allow location access, choose a point on the map, or enter coordinates.'); },
      { timeout: 15000 },
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
      type, description, lat: coords?.lat, lng: coords?.lng, source: locationSource, addressText,
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

    // One key per unchanged submission: a retry after a lost response reuses it, so the server returns the
    // original report instead of creating a second one. Changed content gets a new key.
    const fingerprint = JSON.stringify([
      parsed.data.type, parsed.data.description, parsed.data.lat, parsed.data.lng, parsed.data.source,
      parsed.data.addressText ?? '', hasName && hasPhone ? contactName.trim() : '', hasName && hasPhone ? contactPhone.trim() : '',
      photos.map((p) => {
        // Replacing a File must start a new attempt even when its metadata matches.
        // Retrying the same selected File keeps its identity and submission key.
        let identity = photoIdentities.current.get(p);
        if (!identity) { identity = newSubmissionKey(); photoIdentities.current.set(p, identity); }
        return [identity, p.name, p.size, p.lastModified];
      }),
    ]);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: newSubmissionKey() };
    const key = attempt.current.key;

    inFlight.current = true;
    setBusy(true);
    try {
      const res = (await api('/reports', { method: 'POST', formData: form, headers: { 'Idempotency-Key': key } })) as { id: string; reference: string };
      attempt.current = null;
      navigate(`/my/reports/${res.id}`, { replace: true, state: { reference: res.reference } });
    } catch (err) {
      // Server and transport messages are for developers; show residents a plain next step and keep their entries.
      const failure = apiFailure(err);
      setError(failure?.status === 0
        ? 'Connection lost. We could not confirm your report was received. Your details are still here. Check My reports before sending again.'
        : 'We could not confirm your report was received. Your details are still here. Check My reports before sending again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="resident">
      <SafetyNotice hotlines={hotlines} />
      <MotionForm className="report-form" onSubmit={onSubmit} noValidate>
        <RequiredNote />
        <div className="report-workspace">
        <section className="report-form__group" aria-labelledby="group-situation">
          <div className="form-section-title"><span>1</span><div><h2 id="group-situation">Tell us what happened</h2><p>Select the emergency and describe the situation.</p></div></div>
          <fieldset className="emergency-category-field" id="type" tabIndex={-1} aria-invalid={fieldErrors.type ? true : undefined} aria-describedby={fieldErrors.type ? 'type-error' : undefined}>
            <legend>Type of emergency<RequiredMark /></legend>
            <div className="emergency-types">
              {REPORT_TYPES.map((t) => { const Icon = TYPE_ICON[t]; return <label key={t} className={`emergency-type emergency-type--${t}${type === t ? ' is-selected' : ''}`}><input className="sr-only" type="radio" required name="emergency-type" value={t} checked={type === t} onChange={() => setType(t)} /><Icon size={24} aria-hidden="true" /><span>{TYPE_LABEL[t]}</span>{type === t && <Check size={13} className="emergency-type__check" aria-hidden="true" />}</label>; })}
            </div>
          </fieldset>
          {fieldErrors.type && <FieldError id="type-error" className="field-error">{fieldErrors.type}</FieldError>}

          <label htmlFor="description">What is happening?<RequiredMark /></label>
          <textarea id="description" aria-required="true" rows={5} maxLength={1000} placeholder="Describe what you can see, who needs help, and any immediate hazards…" value={description} onChange={(e) => setDescription(e.target.value)}
            aria-invalid={fieldErrors.description ? true : undefined} aria-describedby={fieldErrors.description ? 'description-error' : undefined} />
          {fieldErrors.description && <FieldError id="description-error" className="field-error">{fieldErrors.description}</FieldError>}
          <p className="field-hint">Keep it specific. <span>{description.length}/1,000 characters</span></p>
        </section>

        <section className="report-form__group" aria-labelledby="group-location">
          <div className="form-section-title"><span>2</span><div><h2 id="group-location">Pin the location<RequiredMark /></h2><p>Choose a location using the map, GPS, or coordinates. A location is required.</p></div></div>
          <fieldset className="report-form__location">
            <legend className="sr-only">Location</legend>
            {mapOpen ? <Suspense fallback={<Skeleton label="Loading location map"><SkeletonRows rows={1} height={320} /></Skeleton>}><ReportLocationMap value={coords} onChange={(point) => { setCoords(point); setLocationSource('manual'); }} /></Suspense> : <div className="location-empty"><MapPin size={34} aria-hidden="true" /><strong>{coords ? 'Location selected' : 'Where is help needed?'}</strong><p>{coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Use your current location or select the incident on a map.'}</p><button className="btn btn--ghost" type="button" onClick={() => setMapOpen(true)}>Open location map</button></div>}
            <button type="button" className="btn btn--ghost gps-action" onClick={useGps} aria-disabled={locating} aria-busy={locating}><LocateFixed size={17} aria-hidden="true" />{locating ? 'Finding location…' : 'Use my location'}</button>
            <p className={`location-status${coords ? ' is-set' : ''}`} role="status">{coords ? <><Check size={15} aria-hidden="true" />{`Location set (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`}</> : 'No location set yet.'}</p>
            {fieldErrors.location && <FieldError id="location-error" className="field-error">{fieldErrors.location}</FieldError>}
            <label htmlFor="address">Address or landmark (optional)</label>
            <input id="address" placeholder="Street, building, or nearby landmark…" value={addressText} onChange={(e) => setAddressText(e.target.value)}
              aria-invalid={fieldErrors.location ? true : undefined} aria-describedby={fieldErrors.location ? 'location-error' : undefined} />
            <details className="coordinate-entry"><summary>Enter coordinates instead</summary><p className="field-hint">Enter both decimal coordinates. The location is only set after you confirm.</p><div className="coordinate-inputs"><label>Latitude<input type="number" step="any" min={-90} max={90} value={manualLat} onChange={(e) => setManualLat(e.target.value)} /></label><label>Longitude<input type="number" step="any" min={-180} max={180} value={manualLng} onChange={(e) => setManualLng(e.target.value)} /></label></div><button type="button" className="btn btn--ghost" disabled={!manualLat.trim() || !manualLng.trim()} onClick={() => { const lat = Number(manualLat), lng = Number(manualLng); if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) { setError('Enter a valid latitude (−90 to 90) and longitude (−180 to 180).'); return; } setCoords({ lat, lng }); setLocationSource('manual'); setError(''); }}>Set coordinates</button></details>
          </fieldset>
        </section>
        <section className="report-form__group report-evidence" aria-labelledby="group-evidence">
          <div className="form-section-title"><Camera size={22} aria-hidden="true" /><div><h2 id="group-evidence">Add photos</h2><p>Optional · Only take photos if it is safe.</p></div></div>
          <label className="photo-upload" htmlFor="photos"><Camera size={26} aria-hidden="true" /><strong>Choose photos to attach</strong><span>Up to 5 images · JPEG, PNG or WebP · 5 MB each</span></label>
          <label className="sr-only" htmlFor="photos">Photos (up to 5)</label>
          <input id="photos" className="photo-file" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => onPhotos(e.target.files)} aria-invalid={fieldErrors.photos ? true : undefined} aria-describedby={fieldErrors.photos ? 'photos-error' : undefined} />
          {photos.length > 0 && <ul className="photo-attachments">{photos.map((p, i) => <li key={`${p.name}-${i}`}><Camera size={15} aria-hidden="true" /><span>{p.name}</span><button type="button" aria-label={`Remove ${p.name}`} onClick={() => setPhotos((files) => files.filter((_, n) => n !== i))}><X size={15} aria-hidden="true" /></button></li>)}</ul>}
          {fieldErrors.photos && <FieldError id="photos-error" className="field-error">{fieldErrors.photos}</FieldError>}
        </section>
        <section className="report-form__group" aria-labelledby="group-contact">
          <div className="form-section-title"><UserRound size={21} aria-hidden="true" /><div><h2 id="group-contact">A way to reach you</h2><p>Optional · Enter both fields or leave both empty.</p></div></div>
          <label htmlFor="contactName">Your name (optional)</label>
          {fieldErrors.contact && <FieldError id="contact-error" className="field-error">{fieldErrors.contact}</FieldError>}
          <input id="contactName" autoComplete="name" value={contactName} onChange={(e) => setContactName(e.target.value)}
            aria-invalid={fieldErrors.contact ? true : undefined} aria-describedby={fieldErrors.contact ? 'contact-error' : undefined} />
          <label htmlFor="contactPhone">Phone (optional)</label>
          <input id="contactPhone" type="tel" autoComplete="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)}
            aria-invalid={fieldErrors.contact ? true : undefined} aria-describedby={fieldErrors.contact ? 'contact-error' : undefined} />
        </section>
        </div>
        <div className="report-submit">
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
        {error && <Banner tone="error" role="alert"><span>{error}</span></Banner>}
        <button type="submit" className="btn" aria-disabled={busy} aria-busy={busy}><Send size={17} aria-hidden="true" />{busy ? 'Sending report…' : 'Submit report'}</button>
        </div>
      </MotionForm>
    </div>
  );
}
