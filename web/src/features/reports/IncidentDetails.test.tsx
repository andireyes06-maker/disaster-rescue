import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { makeReport } from './fixtures';
import type { Report } from '../../types/domain';

const h = vi.hoisted(() => ({
  auth: { role: 'admin' } as { role: string },
  reports: [] as Report[],
  api: vi.fn(),
  over: {} as Record<string, unknown>,
  updates: [] as { id: string; status: string; note: string; peopleRescued: number; at: Date | null }[],
  updatesLoading: false,
  hasMore: false,
  loadOlder: vi.fn(),
  retry: vi.fn(),
}));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => h.auth }));
vi.mock('./useReport', () => ({
  MAX_DUPLICATE_IDS: 10,
  useReport: (id: string) => {
    const report = h.reports.find((r) => r.id === id) || null;
    return { report, loading: false, error: null, notFound: !report, removed: false, retry: h.retry, ...h.over };
  },
  useReportUpdates: () => ({ updates: h.updates, loading: h.updatesLoading, error: null, hasMore: h.hasMore, loadOlder: h.loadOlder }),
  useReportsByIds: (ids: string[]) => Object.fromEntries(ids.map((i) => [i, { report: h.reports.find((r) => r.id === i) || null, loading: false }])),
}));
vi.mock('../../api/client', async () => {
  class ApiError extends Error {
    status: number;
    code: string | undefined;
    constructor({ status, code, message }: { status: number; code?: string; message?: string }) {
      super(message || code);
      this.status = status;
      this.code = code;
    }
  }
  return { api: h.api, ApiError };
});
import { ApiError } from '../../api/client';
import IncidentDetails from './IncidentDetails';

function show(reports: Report[], role = 'admin', id = 'r1', over: Record<string, unknown> = {}) {
  h.auth = { role };
  h.over = over;
  h.reports = reports;
  return render(
    <MemoryRouter initialEntries={[`/incidents/${id}`]}>
      <Routes><Route path="/incidents/:id" element={<IncidentDetails />} /></Routes>
    </MemoryRouter>,
  );
}

describe('IncidentDetails', () => {
  beforeEach(() => { h.updatesLoading = false; h.hasMore = false; h.loadOlder.mockReset(); h.api.mockReset(); h.api.mockResolvedValue({}); });

  it('displays the public reference instead of its storage ID', () => {
    show([makeReport({ reference: 'RR-260005' })]);
    expect(screen.getByText(/Report RR-260005/)).toBeInTheDocument();
    expect(screen.queryByText(/Report r1 ·/)).not.toBeInTheDocument();
  });

  it.each([
    ['Set priority', 'Saving priority…', 'Priority updated.'],
    ['Classify', 'Saving classification…', 'Classification saved.'],
  ])('shows busy feedback and prevents repeat activation for %s', async (label, saving, success) => {
    show([makeReport()]);
    await userEvent.click(screen.getByRole('button', { name: 'Edit priority & classification' }));
    if (label === 'Set priority') await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'high');
    else await userEvent.type(screen.getByLabelText(/classification/i), 'River flooding');
    let finish!: (value: unknown) => void;
    h.api.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    await userEvent.click(screen.getByRole('button', { name: label }));
    const pending = screen.getByRole('button', { name: saving });
    expect(pending).toHaveFocus();
    expect(pending).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(pending);
    expect(h.api).toHaveBeenCalledTimes(1);
    finish({});
    expect(await screen.findByText(success)).toBeInTheDocument();
  });

  it.each(['Submitted', 'Under Verification'] as const)('shows Validate report for %s', (status) => {
    show([makeReport({ status })]);
    expect(screen.getByRole('button', { name: 'Validate report' })).toBeInTheDocument();
  });

  it('opens photo thumbnails in a viewer and steps between them', async () => {
    const user = userEvent.setup();
    show([makeReport({ photos: [{ url: 'https://img.test/a.jpg' }, { url: 'https://img.test/b.jpg' }] } as Partial<Report>)]);
    await user.click(screen.getByRole('button', { name: 'Open photo 1 of 2' }));
    const viewer = screen.getByRole('dialog');
    expect(within(viewer).getByRole('img', { name: 'Incident photo 1' })).toHaveAttribute('src', 'https://img.test/a.jpg');
    expect(within(viewer).getByRole('button', { name: 'Previous' })).toBeDisabled();
    await user.click(within(viewer).getByRole('button', { name: 'Next' }));
    expect(within(viewer).getByRole('img', { name: 'Incident photo 2' })).toHaveAttribute('src', 'https://img.test/b.jpg');
    expect(within(viewer).getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('does not show Validate report for Verified', () => {
    show([makeReport({ status: 'Verified', verified: true })]);
    expect(screen.queryByRole('button', { name: 'Validate report' })).toBeNull();
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();
  });

  it('shows no operational controls for a role without staff actions', () => {
    show([makeReport()], 'responder');
    expect(screen.queryByRole('button', { name: /validate report|assign team|reject|set priority|classify|close report/i })).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows the duplicate comparison when expanded, only when flagged', async () => {
    const other = makeReport({ id: 'r2', description: 'Same flood nearby' });
    const { unmount } = show([makeReport({ possibleDuplicates: ['r2'] }), other]);
    await userEvent.click(screen.getByText('Possible duplicates (1)'));
    const banner = screen.getByRole('region', { name: /possible duplicates/i });
    expect(within(banner).getByText('Same flood nearby')).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: /mark the report you are viewing as a duplicate of this one/i })).toBeInTheDocument();
    unmount();
    show([makeReport(), other]);
    expect(screen.queryByRole('region', { name: /possible duplicates/i })).toBeNull();
  });

  it('marks a candidate as duplicate via PATCH', async () => {
    const other = makeReport({ id: 'r2' });
    show([makeReport({ possibleDuplicates: ['r2'] }), other]);
    await userEvent.click(screen.getByText('Possible duplicates (1)'));
    await userEvent.click(screen.getByRole('button', { name: /mark the report you are viewing as a duplicate of this one/i }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/duplicate', { method: 'PATCH', body: { duplicateOf: 'r2' } });
  });

  it('explains the duplicate direction in the banner', () => {
    show([makeReport({ possibleDuplicates: ['r2'] }), makeReport({ id: 'r2' })]);
    expect(screen.getByText('The report you are viewing will be closed as a duplicate of the report you choose.')).toBeInTheDocument();
  });

  it.each(['Closed', 'Rejected', 'Duplicate', 'Cancelled'] as const)('shows a %s candidate without the mark button', async (status) => {
    show([makeReport({ possibleDuplicates: ['r2'] }), makeReport({ id: 'r2', status, description: 'Old one' })]);
    await userEvent.click(screen.getByText('Possible duplicates (1)'));
    const banner = screen.getByRole('region', { name: /possible duplicates/i });
    expect(within(banner).getByText('Old one')).toBeInTheDocument();
    expect(within(banner).getByText(status)).toBeInTheDocument();
    expect(within(banner).queryByRole('button')).toBeNull();
  });

  it('shows Report unavailable for a candidate that cannot be loaded', () => {
    show([makeReport({ possibleDuplicates: ['gone'] })]);
    expect(screen.getByText('Report unavailable')).toBeInTheDocument();
  });

  it('shows a load error with retry, distinct from not found', async () => {
    show([], 'dispatcher', 'r1', { error: new Error('permission-denied'), notFound: false });
    expect(screen.getByRole('alert')).toHaveTextContent('We could not load this report. Check your connection and try again.');
    expect(screen.queryByText(/not found/i)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(h.retry).toHaveBeenCalled();
  });

  it('lists the newest rescue updates first', () => {
    h.updates = [
      { id: 'u1', status: 'Rescue in Progress', note: 'On site', peopleRescued: 2, at: new Date('2026-10-15T08:00:00Z') },
      { id: 'u2', status: 'Resolved', note: 'Done', peopleRescued: 3, at: new Date('2026-10-15T09:00:00Z') },
    ];
    show([makeReport({ id: 'r1' })]);
    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Resolved');
    expect(items[1]).toHaveTextContent('Rescue in Progress');
    expect(screen.getByText('People rescued: 2')).toBeInTheDocument();
    h.updates = [];
  });

  it('shows the 5 newest of 50 rescue updates and reveals the rest without losing text', async () => {
    const long = (i: number) => `Update ${i} ` + 'z'.repeat(400) + ` end-${i}`;
    h.updates = Array.from({ length: 50 }, (_, i) => ({
      id: `u${i}`, status: 'Rescue in Progress', note: long(i), peopleRescued: 0,
      at: new Date(Date.UTC(2026, 9, 15, 0, i)),
    }));
    show([makeReport({ id: 'r1' })]);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent('Update 49 ');
    await userEvent.click(screen.getByRole('button', { name: 'Show 45 older updates' }));
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(50);
    for (let i = 0; i < 50; i++) expect(screen.getByText(long(i))).toBeInTheDocument();
    h.updates = [];
  });

  it('offers Load older updates when the listener has more history, and calls loadOlder', async () => {
    h.hasMore = true;
    h.updates = Array.from({ length: 20 }, (_, i) => ({
      id: `u${i}`, status: 'Rescue in Progress', note: '', peopleRescued: 0,
      at: new Date(Date.UTC(2026, 9, 15, 0, i)),
    }));
    show([makeReport({ id: 'r1' })]);
    await userEvent.click(screen.getByRole('button', { name: 'Load older updates' }));
    expect(h.loadOlder).toHaveBeenCalledTimes(1);
    h.updates = [];
  });

  it('says so when there are no rescue updates', () => {
    show([makeReport({ id: 'r1' })]);
    expect(screen.getByText('No rescue updates yet.')).toBeInTheDocument();
  });

  it('does not claim there are no rescue updates before their read finishes', () => {
    h.updatesLoading = true;
    show([makeReport({ id: 'r1' })]);
    expect(screen.getByRole('status')).toHaveTextContent('Loading rescue updates');
    expect(screen.queryByText('No rescue updates yet.')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    show([], 'dispatcher', 'r1', { loading: true, notFound: false });
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });

  it('shows a message when the report disappears mid-view', () => {
    show([], 'dispatcher', 'r1', { removed: true, notFound: false });
    expect(screen.getByText(/This report is no longer available/)).toBeInTheDocument();
  });

  it('keeps Reject confirm disabled until a reason is typed, then PATCHes', async () => {
    show([makeReport()]);
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /confirm reject/i });
    expect(confirm).toBeDisabled();
    const box = within(dialog).getByLabelText(/reason/i);
    await userEvent.type(box, '   ');
    expect(confirm).toBeDisabled();
    await userEvent.type(box, 'Prank call');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(h.api).toHaveBeenCalledWith('/reports/r1/reject', { method: 'PATCH', body: { reason: 'Prank call' } });
  });

  it('closes the dialog with Escape', async () => {
    show([makeReport()]);
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('names the reject dialog and marks it modal', async () => {
    show([makeReport()]);
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog', { name: 'Reject this report' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('returns focus to the Reject button after Escape', async () => {
    show([makeReport()]);
    const trigger = screen.getByRole('button', { name: 'Reject' });
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
  });

  it('shows the conflict message on 409', async () => {
    h.api.mockRejectedValue(new ApiError({ status: 409, code: 'conflict' }));
    show([makeReport()]);
    await userEvent.click(screen.getByRole('button', { name: 'Validate report' }));
    expect(await screen.findByText(/Someone else already changed this report/)).toBeInTheDocument();
  });

  it('hides the validate action from dispatchers', () => {
    show([makeReport({ status: 'Submitted' })], 'dispatcher');
    expect(screen.queryByRole('button', { name: 'Validate report' })).toBeNull();
  });

  it('says validation is a manual review, not a photo check', () => {
    show([makeReport({ status: 'Submitted' })]);
    expect(screen.getByText('Validation is a manual review. The system does not check whether a photo is authentic.')).toBeInTheDocument();
  });

  it('shows who validated the report and when', () => {
    show([makeReport({
      status: 'Awaiting Assignment',
      verified: true,
      verifiedBy: { uid: 'admin-1', name: 'Admin Ana' },
      verifiedAt: new Date('2026-10-02T09:30:00Z'),
    } as Partial<Report>)]);
    expect(screen.getByText(/Validated by Admin Ana/)).toBeInTheDocument();
  });

  it('shows success after verify', async () => {
    show([makeReport()]);
    await userEvent.click(screen.getByRole('button', { name: 'Validate report' }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/verify', { method: 'PATCH' });
    expect(await screen.findByText(/verified/i, { selector: '[role="status"]' })).toBeInTheDocument();
  });

  it('sets priority and classification', async () => {
    show([makeReport()]);
    await userEvent.click(screen.getByRole('button', { name: 'Edit priority & classification' }));
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'high');
    await userEvent.click(screen.getByRole('button', { name: 'Set priority' }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/priority', { method: 'PATCH', body: { priority: 'high' } });
    await userEvent.type(screen.getByLabelText(/classification/i), 'Rising river');
    await userEvent.click(screen.getByRole('button', { name: 'Classify' }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/classify', { method: 'PATCH', body: { classification: 'Rising river' } });
  });

  it('hides priority control for closed reports', async () => {
    show([makeReport({ status: 'Closed' })]);
    await userEvent.click(screen.getByRole('button', { name: 'Edit priority & classification' }));
    expect(screen.queryByRole('button', { name: 'Set priority' })).toBeNull();
  });

  it('renders description as literal text', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const { container } = show([makeReport({ description: evil })]);
    expect(screen.getByText(evil)).toBeInTheDocument();
    expect(container.querySelector('.incident__description img')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
  });

  it('shows not found for an unknown id', () => {
    show([makeReport()], 'dispatcher', 'nope');
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
