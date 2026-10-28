import { useRef, useState } from 'react';
import { UserRound } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import Avatar from '../../components/Avatar';
import Banner from '../../components/calm/Banner';
import { useDialogFocusReturn } from '../../components/useDialogFocusReturn';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../components/ui/dialog';
import type { Role } from '../../types/domain';

interface SubmitterProfile {
  uid: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  active: boolean;
  photoUrl: string | null;
}

type Load =
  | { state: 'loading' }
  | { state: 'ready'; profile: SubmitterProfile }
  | { state: 'unavailable' }
  | { state: 'error' };

interface SubmitterProfileDialogProps {
  // The account that submitted the report (report.reporterId). Never the contact person's name.
  reporterId?: string | null;
  role: Role | null | undefined;
}

function roleLabel(role: string | null): string {
  if (role === 'admin') return 'Administrator';
  if (role === 'responder') return 'Rescuer';
  if (role === 'resident') return 'Resident';
  return role || 'Not recorded';
}

// Read-only view of the submitting account, for administrators. It loads only when opened.
export default function SubmitterProfileDialog({ reporterId, role }: SubmitterProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const trigger = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const request = useRef(0);
  useDialogFocusReturn(open, trigger, content);

  if (role !== 'admin' || !reporterId) return null;
  const id = reporterId;

  function fetchProfile() {
    const seq = ++request.current;
    setLoad({ state: 'loading' });
    Promise.resolve()
      .then(() => api(`/users/${encodeURIComponent(id)}`))
      .then((body: unknown) => {
        if (seq !== request.current) return;
        if (!body || typeof body !== 'object') { setLoad({ state: 'unavailable' }); return; }
        setLoad({ state: 'ready', profile: body as SubmitterProfile });
      })
      .catch((err: unknown) => {
        if (seq !== request.current) return;
        setLoad({ state: err instanceof ApiError && err.status === 404 ? 'unavailable' : 'error' });
      });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) fetchProfile();
    else request.current += 1;
  }

  return (
    <>
      <button ref={trigger} type="button" className="btn btn--ghost submitter-profile__open" onClick={() => onOpenChange(true)}>
        <UserRound size={16} aria-hidden="true" /> View submitter profile
      </button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent ref={content} className="profile-dialog submitter-profile">
          <DialogTitle>Submitter profile</DialogTitle>
          <DialogDescription>The account that submitted this report. It can differ from the contact person.</DialogDescription>
          {load.state === 'loading' && <p role="status">Loading profile...</p>}
          {load.state === 'unavailable' && <Banner tone="info" role="status">This profile is unavailable.</Banner>}
          {load.state === 'error' && (
            <Banner tone="error" role="alert">
              We could not load this profile.{' '}
              <button type="button" className="btn btn--ghost" onClick={fetchProfile}>Try again</button>
            </Banner>
          )}
          {load.state === 'ready' && (
            <>
              <section className="profile-identity">
                <Avatar name={load.profile.name} photoUrl={load.profile.photoUrl} size={64} />
                <div>
                  <strong>{load.profile.name || 'Name not recorded'}</strong>
                  <p>{load.profile.email || 'No email recorded'}</p>
                  <span className="badge badge--neutral">{roleLabel(load.profile.role)}</span>
                </div>
              </section>
              <dl className="preview__contact-facts submitter-profile__facts">
                <div><dt>Phone</dt><dd>{load.profile.phone ? <a href={`tel:${load.profile.phone}`}>{load.profile.phone}</a> : 'Not provided'}</dd></div>
                <div><dt>Account status</dt><dd>{load.profile.active ? 'Active' : 'Disabled'}</dd></div>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
