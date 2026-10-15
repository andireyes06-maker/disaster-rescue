import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../api/client.js';
import { apiFailure } from '../../lib/apiError';
import { assignTeamSchema, type AssignTeam } from '../../lib/schemas';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '../../components/ui/dialog';

export const NO_FREE_TEAMS = 'No rescue teams are free right now. Close a finished rescue to free a team, then try again.';

interface Team {
  id: string;
  name: string;
  busy: boolean;
}

interface AssignTeamDialogProps {
  reportId: string;
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
  return 'Something went wrong. Please try again.';
}

function AssignForm({ reportId, freeTeams, onClose, onAssigned }: {
  reportId: string;
  freeTeams: Team[];
  onClose: () => void;
  onAssigned?: () => void;
}) {
  // The schema is fixed for this form's lifetime. The parent mounts it only once teams have loaded.
  const [schema] = useState(() => assignTeamSchema(freeTeams.map((t) => t.id)));
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<AssignTeam>({
    resolver: zodResolver(schema),
    defaultValues: { teamId: '' },
  });

  async function onValid({ teamId }: AssignTeam) {
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
    <form onSubmit={handleSubmit(onValid)} noValidate>
      <label htmlFor="assign-team">Rescue team</label>
      <Controller
        name="teamId"
        control={control}
        render={({ field }) => (
          <select id="assign-team" name="teamId" value={field.value} onChange={(e) => field.onChange(e.target.value)} onBlur={field.onBlur} ref={field.ref}>
            <option value="" disabled>Choose a team</option>
            {freeTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      />
      {message && <p role="alert" className="error"><span aria-hidden="true">✖</span> {message}</p>}
      <div className="actions__row">
        <button type="submit" className="btn" disabled={busy}>Assign team</button>
        <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

export default function AssignTeamDialog({ reportId, onClose, onAssigned }: AssignTeamDialogProps) {
  const [state, setState] = useState<TeamsState>({ teams: [], loading: true, error: null });

  useEffect(() => {
    let active = true;
    api('/teams')
      .then((list: unknown) => {
        if (active) setState({ teams: Array.isArray(list) ? (list as Team[]) : [], loading: false, error: null });
      })
      .catch(() => {
        if (active) setState({ teams: [], loading: false, error: 'Could not load rescue teams.' });
      });
    return () => { active = false; };
  }, []);

  const free = state.teams.filter((t) => !t.busy);
  const showEmpty = !state.loading && !state.error && free.length === 0;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle>Assign a rescue team</DialogTitle>
        {state.loading && <p role="status" className="loading">Loading teams...</p>}
        {state.error && <p role="alert" className="error"><span aria-hidden="true">✖</span> {state.error}</p>}
        {showEmpty && <p className="card empty">{NO_FREE_TEAMS}</p>}
        {!state.loading && !state.error && free.length > 0 && (
          <AssignForm reportId={reportId} freeTeams={free} onClose={onClose} onAssigned={onAssigned} />
        )}
        {showEmpty && (
          <div className="actions__row">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Close</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
