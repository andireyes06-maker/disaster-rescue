import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

const state = vi.hoisted(() => ({
  reportState: {} as Record<string, unknown>,
  api: vi.fn(),
}));
vi.mock('../../api/client', () => ({ api: (...a: unknown[]) => state.api(...a) }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ team: 'team-a', user: { uid: 'ana' }, role: 'responder' }) }));
vi.mock('./useAssignedReports', () => ({
  useAssignedReports: () => ({ reports: [], loading: false, error: null, fromCache: false, retry: () => {}, windowSize: 50, loadMore: () => {} }),
}));
vi.mock('./useClosedTeamReports', () => ({
  useClosedTeamReports: () => ({ reports: [], loading: false, error: null, fromCache: false, retry: () => {} }),
}));
vi.mock('../reports/useReport', () => ({
  useAcknowledgedAt: () => ({ at: null, acknowledged: false, loading: false, error: null }),
  useReportUpdates: () => ({ updates: [], error: null, loading: false, hasMore: false, retry: () => {}, loadOlder: () => {} }),
  useReport: () => ({ ...state.reportState, retry: () => {} }),
}));

import AssignmentsPage from './AssignmentsPage';
import { saveDraft, getDraft, resetDraftStoreForTests } from './draftStore';

const at = new Date('2026-10-19T09:00:00+08:00');
const report = (over: Record<string, unknown>) => ({
  id: 'r1', type: 'flood', status: 'Rescue in Progress', assignedTeamId: 'team-a', reference: 'RR-260012',
  description: '', location: null, addressText: '', priority: 'Critical', createdAt: at, updatedAt: at, ...over,
});
const loaded = (r: unknown) => ({ report: r, loading: false, error: null, notFound: false, removed: false, fromCache: false });
const renderPage = () => render(<MemoryRouter><AssignmentsPage /></MemoryRouter>);

describe('AssignmentsPage drafts', () => {
  beforeEach(() => {
    resetDraftStoreForTests();
    state.reportState = loaded(report({ status: 'Closed' }));
  });

  it('keeps a draft for a report that closed while the responder still has access, shown read-only', async () => {
    saveDraft('r1', { note: 'Unsent note', peopleRescued: '2', status: 'Rescue in Progress' });
    renderPage();
    const section = await screen.findByRole('region', { name: 'Unsent drafts for closed reports' });
    expect(within(section).getByText('Unsent note')).toBeInTheDocument();
    expect(within(section).getByText(/This draft was not sent/)).toBeInTheDocument();
    expect(within(section).queryByRole('textbox')).toBeNull();
    expect(within(section).queryByRole('button', { name: /submit/i })).toBeNull();
    expect(getDraft('r1')?.closed).toMatchObject({ type: 'flood', status: 'Closed', reference: 'RR-260012' });
  });

  it('discards a closed draft only on the explicit button', async () => {
    saveDraft('r1', { note: 'Unsent note' });
    renderPage();
    await screen.findByText('Unsent note');
    await userEvent.click(screen.getByRole('button', { name: 'Discard draft' }));
    expect(screen.queryByText('Unsent note')).toBeNull();
    expect(getDraft('r1')).toBeUndefined();
  });

  it('shows the unconfirmed-save copy and no retry for a closed report with a pending attempt', async () => {
    saveDraft('r1', { note: 'Maybe sent', attempt: { key: 'k-1', fingerprint: 'f', status: 'Rescue in Progress' } });
    renderPage();
    const section = await screen.findByRole('region', { name: 'Unsent drafts for closed reports' });
    expect(within(section).getByText(/We couldn’t confirm whether this update was saved before the report closed/)).toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: /retry|submit/i })).toBeNull();
  });

  it('drops a draft when the report has been reassigned to another team', async () => {
    state.reportState = loaded(report({ status: 'Rescue in Progress', assignedTeamId: 'team-b' }));
    saveDraft('r1', { note: 'Reassigned note' });
    renderPage();
    await vi.waitFor(() => expect(getDraft('r1')).toBeUndefined());
    expect(screen.queryByText('Reassigned note')).toBeNull();
  });

  it('drops a draft when access to the report is lost (unreadable)', async () => {
    state.reportState = { report: null, loading: false, error: new Error('permission-denied'), notFound: false, removed: false, fromCache: false };
    saveDraft('r1', { note: 'No access note' });
    renderPage();
    await vi.waitFor(() => expect(getDraft('r1')).toBeUndefined());
    expect(screen.queryByText('No access note')).toBeNull();
  });

  it('offers the saved-update check only for an unconfirmed attempt', async () => {
    saveDraft('r1', { note: 'Plain closed draft' });
    renderPage();
    await screen.findByText('Plain closed draft');
    expect(screen.queryByRole('button', { name: 'Check whether update was saved' })).toBeNull();
  });

  it('a saved receipt is reported, the attempt is cleared, and the check is read-only', async () => {
    state.api.mockReset();
    state.api.mockResolvedValueOnce({ saved: true, id: 'upd-1', status: 'Rescue in Progress', peopleRescued: 2 });
    saveDraft('r1', { note: 'Maybe sent', attempt: { key: 'key-abcdefgh', fingerprint: 'f', status: 'Rescue in Progress' } });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Check whether update was saved' }));
    expect(await screen.findByRole('status')).toHaveTextContent('This update was saved: Rescue in Progress, 2 rescued. It was not sent again.');
    expect(getDraft('r1')?.attempt).toBeNull();
    expect(state.api).toHaveBeenCalledTimes(1);
    expect(state.api).toHaveBeenCalledWith('/reports/r1/updates/receipt', { headers: { 'Idempotency-Key': 'key-abcdefgh' } });
  });

  it('no receipt keeps the draft read-only and says the submission was not confirmed', async () => {
    state.api.mockReset();
    state.api.mockResolvedValueOnce({ saved: false });
    saveDraft('r1', { note: 'Unconfirmed draft', attempt: { key: 'key-zzzzzzzz', fingerprint: 'f', status: 'Rescue in Progress' } });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Check whether update was saved' }));
    expect(await screen.findByRole('status')).toHaveTextContent('No record of this update was found, so submission wasn’t confirmed.');
    // Focus moves to the result, so it is not lost when the check control is still there or after it changes.
    expect(document.activeElement).toHaveClass('receipt-result');
    expect(screen.getByText('Unconfirmed draft')).toBeInTheDocument();
    expect(getDraft('r1')?.attempt).not.toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(state.api).toHaveBeenCalledTimes(1);
  });

  it('a failed check says so and sends nothing else', async () => {
    state.api.mockReset();
    state.api.mockRejectedValueOnce(new Error('offline'));
    saveDraft('r1', { note: 'Offline draft', attempt: { key: 'key-offline1', fingerprint: 'f', status: 'Rescue in Progress' } });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Check whether update was saved' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t check right now.');
    expect(getDraft('r1')?.attempt).not.toBeNull();
    expect(state.api).toHaveBeenCalledTimes(1);
  });

  it('keeps a draft for a report that is still open, and shows no closed section for it', async () => {
    state.reportState = loaded(report({ status: 'Rescue in Progress' }));
    saveDraft('r1', { note: 'Still open note' });
    renderPage();
    await screen.findByText('No open assignments right now').catch(() => null);
    expect(screen.queryByRole('region', { name: 'Unsent drafts for closed reports' })).toBeNull();
    expect(getDraft('r1')?.note).toBe('Still open note');
    expect(getDraft('r1')?.closed).toBeUndefined();
  });
});
