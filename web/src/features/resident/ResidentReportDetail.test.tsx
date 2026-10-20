import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { makeReport } from '../reports/fixtures';

const h = vi.hoisted(() => ({
  api: vi.fn(),
  reports: [] as unknown[],
  retry: vi.fn(),
  updates: [] as unknown[],
  readError: null as Error | null,
  readLoading: false,
  updatesError: null as Error | null,
  updatesLoading: false,
  hasMore: false,
  loadOlder: vi.fn(),
}));
vi.mock('../../api/client', () => ({ api: h.api }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { uid: 'res-1' }, role: 'resident' }) }));
vi.mock('./useMyReports', () => ({ useMyReports: () => ({ reports: h.reports, loading: h.readLoading, error: h.readError, retry: h.retry }) }));
vi.mock('../reports/useReport', () => ({ useReport: () => ({report: h.reports[0] ?? null, loading: h.readLoading, error: h.readError, retry: h.retry}), useReportUpdates: () => ({ updates: h.updates, loading: h.updatesLoading, error: h.updatesError, retry: h.retry, hasMore: h.hasMore, loadOlder: h.loadOlder }) }));

import ResidentReportDetail from './ResidentReportDetail';

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/my/reports/${id}`]}>
      <Routes><Route path="/my/reports/:id" element={<ResidentReportDetail />} /></Routes>
    </MemoryRouter>,
  );
}

describe('ResidentReportDetail', () => {
  beforeEach(() => {
    h.api.mockReset().mockResolvedValue({ id: 'r1', status: 'Cancelled' });
    h.retry.mockReset();
    h.reports = [makeReport({ id: 'r1', type: 'flood', status: 'Submitted' } as never)];
    h.updates = [];
    h.updatesLoading = false;
    h.updatesError = null;
    h.hasMore = false;
    h.loadOlder.mockReset();
  });

  it('shows known submission and current status without inventing intermediate history', () => {
    h.reports = [makeReport({ id: 'r1', status: 'Team Assigned' })];
    renderAt('r1');
    expect(screen.getByRole('heading', { name: 'Report activity' })).toBeInTheDocument();
    expect(screen.getByText('Report submitted')).toBeInTheDocument();
    expect(screen.getByText('Latest status: Team Assigned')).toBeInTheDocument();
    expect(screen.getByText('No response updates have been posted yet.')).toBeInTheDocument();
    expect(screen.queryByText('Staff verified this report')).not.toBeInTheDocument();
  });

  it('waits for the update read before claiming there are no response updates', () => {
    h.updatesLoading = true;
    renderAt('r1');
    expect(screen.getByRole('status')).toHaveTextContent('Loading response updates');
    expect(screen.queryByText('No response updates have been posted yet.')).not.toBeInTheDocument();
  });

  it('shows Cancel only while the report is Submitted', () => {
    const { unmount } = renderAt('r1');
    expect(screen.getByRole('button', { name: 'Cancel report' })).toBeInTheDocument();
    unmount();
    h.reports = [makeReport({ id: 'r1', status: 'Verified' } as never)];
    renderAt('r1');
    expect(screen.queryByRole('button', { name: 'Cancel report' })).toBeNull();
  });

  it('cancels through the API and refreshes the list', async () => {
    const user = userEvent.setup();
    renderAt('r1');
    await user.click(screen.getByRole('button', { name: 'Cancel report' }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/cancel', expect.objectContaining({ method: 'PATCH' }));
    expect(await screen.findByText('Your report was cancelled.')).toBeInTheDocument();
    expect(h.retry).toHaveBeenCalled();
  });

  it('explains a refused cancel and refreshes (review focus 3)', async () => {
    h.api.mockRejectedValueOnce(Object.assign(new Error('Cannot move from Verified to Cancelled'), { status: 409, code: 'illegal_transition' }));
    const user = userEvent.setup();
    renderAt('r1');
    await user.click(screen.getByRole('button', { name: 'Cancel report' }));
    expect(await screen.findByText(/can no longer be cancelled/)).toBeInTheDocument();
    expect(h.retry).toHaveBeenCalled();
  });

  it('shows the status history with each update', () => {
    h.updates = [{ id: 'u1', status: 'Verified', note: 'Checked by dispatcher', peopleRescued: 0, at: new Date('2026-10-10T08:00:00Z') }];
    renderAt('r1');
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Checked by dispatcher')).toBeInTheDocument();
  });

  it('shows the 5 newest of 50 response updates and keeps every note in full', async () => {
    const long = (i: number) => `Note ${i} ` + 'w'.repeat(400) + ` stop-${i}`;
    h.updates = Array.from({ length: 50 }, (_, i) => ({
      id: `u${i}`, status: 'Rescue in Progress', note: long(i), peopleRescued: 0,
      at: new Date(Date.UTC(2026, 9, 10, 0, i)),
    }));
    renderAt('r1');
    const list = document.querySelector('ol.response-updates') as HTMLElement;
    expect(list.querySelectorAll(':scope > li')).toHaveLength(5);
    await userEvent.click(screen.getByRole('button', { name: 'Show 45 older updates' }));
    expect(list.querySelectorAll(':scope > li')).toHaveLength(50);
    for (let i = 0; i < 50; i++) expect(screen.getByText(long(i))).toBeInTheDocument();
    h.updates = [];
  });

  it('offers Load older updates when the listener has more history, and calls loadOlder', async () => {
    h.updates = Array.from({ length: 20 }, (_, i) => ({
      id: `u${i}`, status: 'Rescue in Progress', note: '', peopleRescued: 0,
      at: new Date(Date.UTC(2026, 9, 10, 0, i)),
    }));
    h.hasMore = true;
    renderAt('r1');
    await userEvent.click(screen.getByRole('button', { name: 'Load older updates' }));
    expect(h.loadOlder).toHaveBeenCalledTimes(1);
    h.hasMore = false;
    h.updates = [];
  });

  it('says so when the report is not in this resident\'s list', () => {
    h.reports = [];
    renderAt('nope');
    expect(screen.getByText('We could not find this report.')).toBeInTheDocument();
  });

  it('a failed first read says the report could not load, not that it does not exist', () => {
    h.reports = [];
    h.readError = new Error('unavailable');
    renderAt('r1');
    expect(screen.getByRole('alert')).toHaveTextContent(/could not load this report/i);
    expect(screen.queryByText(/could not find this report/i)).toBeNull();
    h.readError = null;
  });

  it('Try again after a failed read calls the retry', async () => {
    h.reports = [];
    h.readError = new Error('unavailable');
    renderAt('r1');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(h.retry).toHaveBeenCalled();
    h.readError = null;
  });

  it('a successful read with no matching report says it was not found', () => {
    h.reports = [];
    renderAt('missing');
    expect(screen.getByText(/could not find this report/i)).toBeInTheDocument();
  });
  it('shows the resident’s attached evidence with an explicit new-tab link', () => {
    h.reports = [makeReport({ id: 'r1', photos: [{ url: 'https://example.test/evidence.jpg' }] })];
    renderAt('r1');
    const photo = screen.getByRole('link', { name: 'Open attached photo 1 in a new tab' });
    expect(photo).toHaveAttribute('href', 'https://example.test/evidence.jpg');
    expect(photo).toHaveAttribute('rel', 'noopener noreferrer');
    expect(photo).toHaveAttribute('target', '_blank');
  });

});

it('a permission-denied direct link has a neutral unavailable state rather than an endless retry', () => {
 h.reports = []; h.readLoading = false; h.readError = Object.assign(new Error('denied'), {code:'permission-denied'});
 renderAt('foreign-or-missing');
 expect(screen.getByText('We could not find this report.')).toBeInTheDocument();
 expect(screen.queryByRole('button', {name:'Try again'})).not.toBeInTheDocument();
 h.readError = null;
});
