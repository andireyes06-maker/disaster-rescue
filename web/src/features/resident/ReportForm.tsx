import { PHONE_PATTERN } from '../../lib/schemas';
import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import FieldError from '../../components/FieldError';
import MotionForm from '../../components/MotionForm';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Waves, Flame, Mountain, Building2, CircleHelp, MapPin, LocateFixed, Camera, Send, UserRound, Check, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import { useOptionalUid } from '../../auth/AuthProvider';
import { checkReportPhotos, webReportSchema } from '../../lib/schemas';
import { REPORT_TYPES } from '../../types/domain';
import Banner from '../../components/calm/Banner';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import SafetyNotice from './SafetyNotice';
import { useHotlines } from './useHotlines';
import { useUnsavedChanges } from './UnsavedChanges';
import { createAttemptStore, digestSubmission } from './submissionAttempts';
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


export default function ReportForm() {
  const navigate = useNavigate();
  const hotlines = useHotlines();
  const inFlight = useRef(false);
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
  // Resolution state for unconfirmed sends (CODEX-REPAIR-REVIEW R1 and R3). No notice shows report content.
  const [memoryOnly, setMemoryOnly] = useState(false);
  const [capacityBlocked, setCapacityBlocked] = useState(false);
  const [replay, setReplay] = useState<{ digest: string; id: string; reference: string } | null>(null);
  const replayRef = useRef<HTMLDivElement>(null);
  const capacityRef = useRef<HTMLDivElement>(null);
  // Retry keys for unconfirmed sends are scoped to the signed-in account and this deployment (submissionAttempts.ts).
  const uid = useOptionalUid();
  const attemptStore = useMemo(() => createAttemptStore(uid ? { uid, project: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '', apiBase: import.meta.env.VITE_API_BASE_URL ?? '' } : null), [uid]);
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
  // In-app navigation asks before leaving while the form is dirty (F06). Cleared when the form unmounts.
  const { setDirty } = useUnsavedChanges();
  useEffect(() => { setDirty(dirty); }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

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
    await send(false);
  }

  // newIntent: the person chose to send these details as a new report, so an earlier key for them is dropped first.
  async function send(newIntent: boolean) {
    if (inFlight.current) return;
    setError('');
    setReplay(null);
    setCapacityBlocked(false);

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
    else if (hasPhone && !PHONE_PATTERN.test(contactPhone.trim())) errs.contact = 'Enter a valid phone number with 7 to 15 digits.';
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

    // Retry protection (IDEMPOTENCY-REPAIR-SPEC.md). The digest covers the normalized fields and the bytes of each photo, so
    // re-entering the same report in this tab after a reload reuses its retry key. Changed content gets a new key.
    // inFlight is set before the asynchronous digest, so a second activation cannot start while hashing.
    inFlight.current = true;
    setBusy(true);
    let digest: string | null = null;
    try {
      digest = await digestSubmission({
        type: parsed.data.type, description: parsed.data.description, lat: parsed.data.lat, lng: parsed.data.lng,
        source: parsed.data.source, addressText: parsed.data.addressText ?? '',
        contactName: hasName && hasPhone ? contactName.trim() : '', contactPhone: hasName && hasPhone ? contactPhone.trim() : '',
      }, photos);
      if (newIntent) attemptStore.forget(digest);
      const choice = attemptStore.keyFor(digest);
      setMemoryOnly(!choice.persisted);
      if (choice.key === null) { setCapacityBlocked(true); return; }
      let replayed = false;
      const res = (await api('/reports', {
        method: 'POST', formData: form, headers: { 'Idempotency-Key': choice.key },
        onResponse: (reply) => { replayed = reply.headers.get('Idempotent-Replayed') === '1'; },
      })) as { id: string; reference: string };
      if (replayed) {
        // This key had already completed. Ask rather than treat a deliberate new send as a silent retry.
        setReplay({ digest, id: res.id, reference: res.reference });
        return;
      }
      attemptStore.confirm(digest);
      setDirty(false);
      navigate(`/my/reports/${res.id}`, { replace: true, state: { reference: res.reference } });
    } catch (err) {
      // Server and transport messages are for developers; show residents a plain next step and keep their entries.
      const failure = apiFailure(err);
      // A refusal of this content (400, or 409 for a reused key) means this key made no report, so its entry is dropped.
      if (digest && (failure?.status === 400 || (failure?.status === 409 && failure.code === 'idempotency_conflict'))) attemptStore.forget(digest);
      setError(failure?.code === 'submission_unresolved'
        ? 'An earlier attempt to send this report could not be confirmed. Check My reports before sending it again.'
        : failure?.code === 'idempotency_conflict'
        ? 'We could not match this send to an earlier attempt. Check My reports before sending again.'
        : failure?.status === 429
        ? 'Too many requests. Keep this page open and try again in a few minutes. Check My reports before sending again.'
        : failure?.status === 0
        ? 'Connection lost. We could not confirm your report was received. Your details are still here. Check My reports before sending again.'
        : 'We could not confirm your report was received. Your details are still here. Check My reports before sending again.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  // Opens the report that an earlier send of these details already created, and clears this tab's key for it.
  function openReplay() {
    if (!replay) return;
    attemptStore.confirm(replay.digest);
    setDirty(false);
    navigate(`/my/reports/${replay.id}`, { replace: true, state: { reference: replay.reference } });
  }

  function forgetUnconfirmed() {
    const result = attemptStore.forgetAll();
    setMemoryOnly(!result.persisted);
    setCapacityBlocked(false);
  }

  useEffect(() => { if (replay) replayRef.current?.focus(); }, [replay]);
  useEffect(() => { if (capacityBlocked) capacityRef.current?.focus(); }, [capacityBlocked]);

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
        <p className="report-form__note">Your entries are not saved on this device, and a reload clears them. If a send could not be confirmed, this tab keeps a retry key, so sending the same report again does not create a duplicate.</p>
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
        {replay && (
          <div data-replay-notice tabIndex={-1} ref={replayRef} className="report-form__resolution">
            <Banner tone="info" role="status">This report has already been received from an earlier send of these details, so it was not sent again. Open it, or choose Send as a new report to create another one.</Banner>
            <div className="actions__row">
              <button type="button" className="btn" onClick={openReplay}>Open the report</button>
              <button type="button" className="btn btn--ghost" onClick={() => { setReplay(null); void send(true); }}>Send as a new report</button>
            </div>
          </div>
        )}
        {capacityBlocked && (
          <div data-capacity-notice tabIndex={-1} ref={capacityRef} className="report-form__resolution">
            <Banner tone="info" role="status">This tab already holds unconfirmed sends for {attemptStore.unresolvedCount()} other report versions, so this version is not sent yet. Check My reports to see which were received. Your entries are still here.</Banner>
            <div className="actions__row">
              <Link className="btn btn--ghost" to="/my">Check My reports</Link>
              <button type="button" className="btn btn--ghost" onClick={forgetUnconfirmed}>Forget these unconfirmed sends</button>
            </div>
          </div>
        )}
        {memoryOnly && <Banner tone="info" role="status">Retry protection is kept only for this page. If this page reloads before a send is confirmed, check My reports before sending again.</Banner>}
        {error && <Banner tone="error" role="alert"><span>{error}</span></Banner>}
        <button type="submit" className="btn" aria-disabled={busy} aria-busy={busy}><Send size={17} aria-hidden="true" />{busy ? 'Sending report…' : 'Submit report'}</button>
        </div>
      </MotionForm>
    </div>
  );
}
