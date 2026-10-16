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
}));
vi.mock('../../api/client', () => ({ api: h.api }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { uid: 'res-1' }, role: 'resident' }) }));
vi.mock('./useMyReports', () => ({ useMyReports: () => ({ reports: h.reports, loading: h.readLoading, error: h.readError, retry: h.retry }) }));
vi.mock('../reports/useReport', () => ({ useReportUpdates: () => ({ updates: h.updates, error: h.updatesError, retry: h.retry }) }));

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
});
