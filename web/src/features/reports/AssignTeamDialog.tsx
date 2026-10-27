import RequiredMark, { RequiredNote } from '../../components/RequiredMark';
import MotionForm from '../../components/MotionForm';
import { useDialogFocusReturn } from '../../components/useDialogFocusReturn';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../api/client';
import { apiFailure } from '../../lib/apiError';
import { assignTeamsSchema, type AssignTeams } from '../../lib/schemas';
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
    if (failure.code === 'team_no_members') return "You can't assign this team. It has no members yet. Add a responder to the team first.";
    if (failure.status === 409) return 'This report cannot be assigned right now. Reload the page to see its latest status.';
    if (failure.status === 403) return 'You do not have permission to do that.';
    if (failure.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Could not confirm the team assignment. Reload this report to check its current team.';
}

// Team identities, in the order their tabs appear. Teams with no identity count as Rescue.
const IDENTITIES = ['PNP', 'BFP', 'Rescue', 'MDDRMO', 'Other'] as const;
const identityOf = (team: Team) => (team.kind && (IDENTITIES as readonly string[]).includes(team.kind) ? team.kind : 'Rescue');

function AssignForm({ reportId, freeTeams, onClose, onAssigned }: {
  reportId: string;
  freeTeams: { team: Team; km: number | null }[];
  onClose: () => void;
  onAssigned?: () => void;
}) {
  // The schema is fixed for this form's lifetime. The parent mounts it only once teams have loaded.
  const [schema] = useState(() => assignTeamsSchema(freeTeams.map((t) => t.team.id)));
  const [busy, setBusy] = useState(false);
  // Only identities that have a free team get a tab. The tab shows that identity's teams; selections persist across tabs.
  // Every identity always has a tab, so the choice is visible even when only one identity has a free team.
  const tabs = IDENTITIES;
  const firstWithTeams = IDENTITIES.find((id) => freeTeams.some(({ team }) => identityOf(team) === id)) ?? IDENTITIES[0];
  const [tab, setTab] = useState<string>(firstWithTeams);
  const activeTab = (tabs as readonly string[]).includes(tab) ? tab : firstWithTeams;
  const teamsInTab = freeTeams.filter(({ team }) => identityOf(team) === activeTab);
  const [apiError, setApiError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<AssignTeams>({
    resolver: zodResolver(schema),
    defaultValues: { teamIds: [] },
  });

  async function onValid({ teamIds }: AssignTeams) {
    if (busy) return;
    setBusy(true);
    setApiError(null);
    try {
      await api(`/reports/${reportId}/assign`, { method: 'POST', body: { teamIds } });
      if (onAssigned) onAssigned();
      onClose();
    } catch (err) {
      setApiError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const message = errors.teamIds?.message ?? apiError;

  return (
    <MotionForm onSubmit={handleSubmit(onValid)} noValidate>
      <fieldset className="assign-teams" aria-describedby={message ? 'assign-error' : undefined}>
        <legend><RequiredNote /><RequiredMark /> Rescue teams</legend>
        <p className="field-hint">Choose one or more teams. Each chosen team works on this report.</p>
        <Controller
          name="teamIds"
          control={control}
          render={({ field }) => (
            <>
              {(
                <div role="tablist" aria-label="Team identity" className="assign-teams__tabs">
                  {tabs.map((id) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      id={`assign-tab-${id}`}
                      aria-selected={activeTab === id}
                      aria-controls="assign-teams-panel"
                      tabIndex={activeTab === id ? 0 : -1}
                      className={`assign-teams__tab${activeTab === id ? ' is-active' : ''}`}
                      onClick={() => setTab(id)}
                    >
                      {id}
                      <span className="assign-teams__count">{freeTeams.filter(({ team }) => identityOf(team) === id).length}</span>
                    </button>
                  ))}
                </div>
              )}
              <div role="tabpanel" id="assign-teams-panel" aria-labelledby={`assign-tab-${activeTab}`} className="assign-teams__list">
                {teamsInTab.length === 0 && <p className="field-hint">No free {activeTab} teams right now.</p>}
                {teamsInTab.map(({ team: t, km }) => (
                  <label key={t.id} className="assign-teams__option">
                    <input
                      type="checkbox"
                      value={t.id}
                      checked={field.value.includes(t.id)}
                      onChange={(e) => field.onChange(e.target.checked ? [...field.value, t.id] : field.value.filter((id) => id !== t.id))}
                    />
                    <span>{km === null ? `${t.name} (no headquarters set)` : `${t.name}, ${km.toFixed(1)} km away`}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        />
      </fieldset>
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
