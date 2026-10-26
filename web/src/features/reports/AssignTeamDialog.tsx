import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import MotionForm from '../../components/MotionForm';
import { useDialogFocusReturn } from '../../components/useDialogFocusReturn';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import { assignTeamSchema, type AssignTeam } from '../../lib/schemas';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../components/ui/dialog';

export const NO_FREE_TEAMS = 'No rescue teams are free right now. Close a finished rescue to free a team, then try again.';

import type { Team } from '../../types/domain';
import Banner from '../../components/calm/Banner';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import { distanceMeters } from './format';
import type { GeoPoint } from '../../types/domain';

interface AssignTeamDialogProps {
  open?: boolean;
  returnFocusTo?: React.RefObject<HTMLElement | null>;
  reportId: string;
  // Where the incident is. Teams are listed nearest first, with their distance from it.
  reportLocation?: GeoPoint | null;
  onClose: () => void;
  onAssigned?: () => void;
}

interface TeamsState {
  teams: Team[];
  loading: boolean;
  error: string | null;
}

function errorText(err: unknown): string {
  const failure = apiFailure(err);
  if (failure) {
    if (failure.code === 'team_busy') return 'That team was just sent to another rescue. Choose another team.';
    if (failure.status === 409) return 'This report cannot be assigned right now. Reload the page to see its latest status.';
    if (failure.status === 403) return 'You do not have permission to do that.';
    if (failure.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Could not confirm the team assignment. Reload this report to check its current team.';
}

function AssignForm({ reportId, freeTeams, onClose, onAssigned }: {
  reportId: string;
  freeTeams: { team: Team; km: number | null }[];
  onClose: () => void;
  onAssigned?: () => void;
}) {
  // The schema is fixed for this form's lifetime. The parent mounts it only once teams have loaded.
  const [schema] = useState(() => assignTeamSchema(freeTeams.map((t) => t.team.id)));
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<AssignTeam>({
    resolver: zodResolver(schema),
    defaultValues: { teamId: '' },
  });

  async function onValid({ teamId }: AssignTeam) {
    if (busy) return;
    setBusy(true);
    setApiError(null);
    try {
      await api(`/reports/${reportId}/assign`, { method: 'POST', body: { teamId } });
      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      setApiError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const message = errors.teamId?.message ?? apiError;

  return (
    <MotionForm onSubmit={handleSubmit(onValid)} noValidate>
      <RequiredNote /><label htmlFor="assign-team">Rescue team<RequiredMark /></label>
      <Controller
        name="teamId"
        control={control}
        render={({ field }) => (
          <select id="assign-team" aria-required="true" aria-invalid={!!errors.teamId} aria-describedby={message ? 'assign-error' : undefined} name="teamId" value={field.value} onChange={(e) => field.onChange(e.target.value)} onBlur={field.onBlur} ref={field.ref}>
            <option value="" disabled>Choose a team</option>
            {freeTeams.map(({ team: t, km }) => <option key={t.id} value={t.id}>{km === null ? `${t.name} (no headquarters set)` : `${t.name}, ${km.toFixed(1)} km away`}</option>)}
          </select>
        )}
      />
      {message && <Banner id="assign-error" tone="error" role="alert">{message}</Banner>}
      <div className="actions__row">
        <button type="submit" className="btn" aria-disabled={busy} aria-busy={busy}>Assign team</button>
        <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
      </div>
    </MotionForm>
  );
}

export default function AssignTeamDialog({ open = true, reportId, reportLocation, onClose, onAssigned, returnFocusTo }: AssignTeamDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  useDialogFocusReturn(open, returnFocusTo, contentRef);
  const [state, setState] = useState<TeamsState>({ teams: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api('/teams')
      .then((list: unknown) => {
        if (active) setState({ teams: Array.isArray(list) ? (list as Team[]) : [], loading: false, error: null });
      })
      .catch(() => {
        if (active) setState({ teams: [], loading: false, error: 'Could not load rescue teams.' });
      });
    return () => { active = false; };
  }, [attempt, open]);

  // Nearest first. Teams without a headquarters point go last.
  const free = state.teams
    .filter((t) => !t.busy)
    .map((team) => {
      const m = team.hq ? distanceMeters(team.hq, reportLocation) : null;
      return { team, km: m === null ? null : m / 1000 };
    })
    .sort((a, b) => (a.km === null ? 1 : b.km === null ? -1 : a.km - b.km));
  const showEmpty = !state.loading && !state.error && free.length === 0;
  const showForm = !state.loading && !state.error && free.length > 0;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) { returnFocusTo?.current?.focus(); onClose(); } }}>
      <DialogContent
        ref={contentRef}
        onEscapeKeyDown={() => returnFocusTo?.current?.focus()}
        showCloseButton={false}
        aria-describedby={undefined}
        onCloseAutoFocus={(e) => { if (returnFocusTo?.current) { e.preventDefault(); returnFocusTo.current.focus(); } }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle>Assign a rescue team</DialogTitle>
        {state.loading && <Skeleton label="Loading teams"><SkeletonRows rows={2} height={44} /></Skeleton>}
        {state.error && <Banner tone="error" role="alert">{state.error}</Banner>}
        {showEmpty && <p className="card empty">{NO_FREE_TEAMS}</p>}
        {showForm && (
          <AssignForm reportId={reportId} freeTeams={free} onClose={() => { returnFocusTo?.current?.focus(); onClose(); }} onAssigned={onAssigned} />
        )}
        {!showForm && (
          // Always a way out while loading, after an error, and when no team is free (W04).
          <div className="actions__row">
            {state.error && (
              <button type="button" className="btn" onClick={() => setAttempt((n) => n + 1)}>Try again</button>
            )}
            <button type="button" className="btn btn--ghost" onClick={onClose}>Close</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
