import { useRef, useState, type ChangeEvent } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { api } from '../../api/client';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';
const SAVE_FAILED = 'Could not save your photo. Your current photo is unchanged.';
const REMOVE_FAILED = 'Could not remove your photo. Your current photo is unchanged.';

interface Props {
  photoUrl: string | null;
  onPhotoChange: (photoUrl: string | null) => void;
}

function photoUrlOf(reply: unknown): string | null {
  const url = (reply as { photoUrl?: unknown } | null)?.photoUrl;
  return typeof url === 'string' && url ? url : null;
}

// Change or remove the signed-in person's profile photo. The current photo only changes after the
// server confirms, so a failed request always leaves the old photo in place.
export default function ProfilePhotoControls({ photoUrl, onPhotoChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const say = (message: string, isError = false) => { setStatus(message); setFailed(isError); };

  // Disabled buttons drop focus, so put it back on Change photo once the request settles.
  const refocus = () => requestAnimationFrame(() => changeRef.current?.focus());

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) {
      say('Choose a JPEG, PNG or WebP photo.', true);
      return;
    }
    if (file.size > MAX_BYTES) {
      say('This photo is larger than 5 MB. Choose a smaller photo.', true);
      return;
    }
    setBusy(true);
    say('Saving your photo...');
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const next = photoUrlOf(await api('/users/me/photo', { method: 'PUT', formData, timeoutMs: 60_000 }));
      if (!next) throw new Error('no photo url');
      onPhotoChange(next);
      say('Your photo is saved.');
    } catch {
      say(SAVE_FAILED, true);
    } finally {
      setBusy(false);
      refocus();
    }
  }

  async function onRemove() {
    setBusy(true);
    say('Removing your photo...');
    try {
      await api('/users/me/photo', { method: 'DELETE' });
      onPhotoChange(null);
      say('Your photo is removed.');
    } catch {
      say(REMOVE_FAILED, true);
    } finally {
      setBusy(false);
      refocus();
    }
  }

  return (
    <div className="profile-photo">
      <div className="profile-photo__actions">
        <button ref={changeRef} type="button" className="btn btn--ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Camera size={16} aria-hidden="true" />Change photo
        </button>
        {photoUrl && (
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={onRemove}>
            <Trash2 size={16} aria-hidden="true" />Remove photo
          </button>
        )}
        <input ref={inputRef} type="file" accept={ACCEPT} aria-label="Choose a profile photo" className="visually-hidden" tabIndex={-1} disabled={busy} onChange={onFile} />
      </div>
      <p className="profile-photo__hint">JPEG, PNG or WebP, up to 5 MB.</p>
      <p className="profile-photo__status" role="status" data-tone={failed ? 'error' : undefined}>{status}</p>
    </div>
  );
}
