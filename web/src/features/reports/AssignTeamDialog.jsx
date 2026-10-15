import { useEffect, useState } from 'react';
import { api, ApiError } from '../../api/client.js';
import Dialog from './Dialog.jsx';

export const NO_FREE_TEAMS = 'No rescue teams are free right now. Close a finished rescue to free a team, then try again.';

function errorText(err) {
  if (err instanceof ApiError || (err && typeof err.status === 'number')) {
    if (err.code === 'team_busy') return 'That team was just sent to another rescue. Choose another team.';
    if (err.status === 409) return 'This report cannot be assigned right now. Reload the page to see its latest status.';
    if (err.status === 403) return 'You do not have permission to do that.';
    if (err.status === 0) return 'Network error. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export default function AssignTeamDialog({ reportId, onClose, onAssigned }) {
  const [state, setState] = useState({ teams: [], loading: true, error: null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;
    api('/teams')
      .then((teams) => { if (active) setState({ teams: Array.isArray(teams) ? teams : [], loading: false, error: null }); })
      .catch(() => { if (active) setState({ teams: [], loading: false, error: 'Could not load rescue teams.' }); });
    return () => { active = false; };
  }, []);

  const free = state.teams.filter((t) => !t.busy);

  async function onSubmit(e) {
    e.preventDefault();
    // Read the live DOM value so a tampered or stale option is checked, not trusted.
    const teamId = String(new FormData(e.currentTarget).get('team') ?? '');
    if (!free.some((t) => t.id === teamId)) {
      setMessage({ kind: 'error', text: 'Choose a free rescue team.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await api(`/reports/${reportId}/assign`, { method: 'POST', body: { teamId } });
      if (onAssigned) onAssigned();
      if (onClose) onClose();
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Assign a rescue team" onClose={onClose}>
      {state.loading && <p role="status" className="loading">Loading teams...</p>}
      {state.error && <p role="alert" className="error"><span aria-hidden="true">✖</span> {state.error}</p>}
      {!state.loading && !state.error && free.length === 0 && (
        <p className="card empty">{NO_FREE_TEAMS}</p>
      )}
      {!state.loading && !state.error && free.length > 0 && (
        <form onSubmit={onSubmit} noValidate>
          <label htmlFor="assign-team">Rescue team</label>
          <select id="assign-team" name="team" defaultValue="">
            <option value="" disabled>Choose a team</option>
            {free.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {message && <p role="alert" className="error"><span aria-hidden="true">✖</span> {message.text}</p>}
          <div className="actions__row">
            <button type="submit" className="btn" disabled={busy}>Assign team</button>
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      )}
      {!state.loading && !state.error && free.length === 0 && (
        <div className="actions__row">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Close</button>
        </div>
      )}
    </Dialog>
  );
}
