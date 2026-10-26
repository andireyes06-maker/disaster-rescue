import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { makeReport } from './fixtures';
import type { Report } from '../../types/domain';

const h = vi.hoisted(() => ({
  reports: [] as Report[],
  loading: false,
  error: null as Error | null,
  role: 'admin' as string,
}));
vi.mock('./useAwaitingReports', () => ({ useAwaitingReports: () => ({ reports: h.reports, loading: h.loading, error: h.error, retry: () => {} }) }));
vi.mock('./useReports', () => ({ useReports: () => ({ reports: h.reports, loading: h.loading, error: h.error, retry: () => {} }) }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ role: h.role }) }));
vi.mock('./useReport', () => ({ useReportUpdates: () => ({ updates: [], error: null, retry: () => {} }) }));
import ReportQueue from './ReportQueue';

function show(reports: Report[], { loading = false, error = null }: { loading?: boolean; error?: Error | null } = {}) {
  h.reports = reports;
  h.loading = loading;
  h.error = error;
  return render(<MemoryRouter><ReportQueue /></MemoryRouter>);
}
const data = () => [
  makeReport({ id: 'a', description: 'Flood A', type: 'flood', priority: 'critical', verified: true, status: 'Verified' }),
  makeReport({ id: 'b', description: 'Fire B', type: 'fire', priority: 'low', verified: false, status: 'Submitted' }),
];
const inbox = () => screen.getByRole('list', { name: 'Incident inbox' });
const preview = () => screen.getByLabelText('Selected report');

describe('ReportQueue', () => {
  it('shows the empty state', () => {
    h.role = 'dispatcher';
    show([]);
    expect(screen.getByText(/no reports received yet/i)).toBeInTheDocument();
  });

  it('shows an error and no empty state when the listener failed', () => {
    show([], { error: new Error('denied') });
    expect(screen.getByRole('alert')).toHaveTextContent(/could not load reports/i);
    expect(screen.queryByText(/no reports match/i)).toBeNull();
  });

  it('shows loading and no empty state while loading', () => {
    show([], { loading: true });
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText(/no reports match/i)).toBeNull();
  });

  it('lists open reports oldest first and marks the first visible report as selected', () => {
    show([
      makeReport({ id: 'new', description: 'Flood New', type: 'flood', status: 'Submitted', createdAt: new Date('2026-10-02T08:00:00Z') }),
      makeReport({ id: 'old', description: 'Fire Old', type: 'fire', status: 'Submitted', createdAt: new Date('2026-10-01T08:00:00Z') }),
    ]);
    const rows = within(inbox()).getAllByRole('button');
    expect(rows[0]).toHaveTextContent('Fire Old');
    expect(rows[0]).toHaveAttribute('aria-pressed', 'true');
    expect(rows[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('says how the queue is ordered and that priority does not change it', () => {
    show(data());
    expect(screen.getByText('Oldest first. Priority does not change the order.')).toBeInTheDocument();
  });

  it('selecting a row updates the preview without navigating', async () => {
    show(data());
    await userEvent.click(within(inbox()).getByRole('button', { name: /Fire B/ }));
    expect(within(preview()).getByRole('heading', { name: 'Fire report' })).toBeInTheDocument();
    expect(within(preview()).getByRole('link', { name: 'Open full report' })).toHaveAttribute('href', '/incidents/b');
  });

  it('offers the validate action to admins for a submitted report', async () => {
    h.role = 'admin';
    show(data());
    await userEvent.click(within(inbox()).getByRole('button', { name: /Fire B/ }));
    expect(within(preview()).getByRole('link', { name: 'Validate report' })).toHaveAttribute('href', '/incidents/b');
  });

  it('shows the next step as text only for roles that cannot act', async () => {
    h.role = 'dmo';
    show(data());
    await userEvent.click(within(inbox()).getByRole('button', { name: /Fire B/ }));
    expect(within(preview()).queryByRole('link', { name: 'Validate report' })).toBeNull();
    expect(within(preview()).getByText('Validate the report')).toBeInTheDocument();
    h.role = 'dispatcher';
  });

  it('lets an admin open the verify action, as the server allows', async () => {
    h.role = 'admin';
    show(data());
    await userEvent.click(within(inbox()).getByRole('button', { name: /Fire B/ }));
    expect(within(preview()).getByRole('link', { name: 'Validate report' })).toBeInTheDocument();
    h.role = 'dispatcher';
  });

  it('keeps a long description in full inside the preview', () => {
    const long = 'x'.repeat(600);
    show([makeReport({ id: 'long', description: long, type: 'flood' })]);
    expect(within(preview()).getByText(long)).toBeInTheDocument();
  });

  it('computes summary cards from the full dataset', () => {
    show(data());
    const card = (name: string) => document.querySelector('.summary')?.textContent?.match(new RegExp(`${name}(\\d+)`))?.[1];
    expect(card('All reports')).toBe('2');
    expect(card('Active reports')).toBe('2');
    expect(card('Critical')).toBe('1');
    expect(card('Verified')).toBe('1');
  });

  it('excludes resolved and terminal reports from the active workload without hiding them from the queue', () => {
    show([makeReport({ id: 'active', status: 'Submitted', description: 'Needs response' }), makeReport({ id: 'resolved', status: 'Resolved', description: 'Rescue complete' }), makeReport({ id: 'closed', status: 'Closed', description: 'Review complete' })]);
    expect(document.querySelector('.summary')).toHaveTextContent('Active reports1');
    expect(within(inbox()).getByText('Rescue complete')).toBeInTheDocument();
    expect(within(inbox()).getByText('Review complete')).toBeInTheDocument();
  });

  it('Needs verification quick view shows only submitted or under-verification reports', async () => {
    show([
      makeReport({ id: 'new', status: 'Submitted', description: 'New one' }),
      makeReport({ id: 'checking', status: 'Under Verification', description: 'Checking one' }),
      makeReport({ id: 'team', status: 'Team Assigned', description: 'Team one' }),
    ]);
    await userEvent.click(screen.getByRole('button', { name: /Needs verification/ }));
    expect(screen.getByRole('button', { name: /Needs verification/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(inbox()).getByText('New one')).toBeInTheDocument();
    expect(within(inbox()).getByText('Checking one')).toBeInTheDocument();
    expect(within(inbox()).queryByText('Team one')).toBeNull();
  });

  it('quick view counts come from all reports, not the filtered result', async () => {
    show(data());
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'fire');
    expect(screen.getByRole('button', { name: /Needs verification/ })).toHaveTextContent('(1)');
    expect(screen.getByRole('button', { name: /Active/ })).toHaveTextContent('(2)');
  });

  it.each([
    ['Status', 'Submitted'],
    ['Type', 'fire'],
    ['Priority', 'low'],
    ['Verification', 'pending'],
  ])('filter %s narrows rows', async (label, value) => {
    show(data());
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    await userEvent.selectOptions(screen.getByLabelText(label), value);
    expect(within(inbox()).queryByText('Flood A')).toBeNull();
    expect(within(inbox()).getByText('Fire B')).toBeInTheDocument();
  });

  it('keeps the selected report visible with a note when filters hide it', async () => {
    show(data());
    await userEvent.click(within(inbox()).getByRole('button', { name: /Flood A/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'fire');
    expect(within(preview()).getByText(/not in the current results/i)).toBeInTheDocument();
    expect(within(preview()).getByRole('heading', { name: 'Flood report' })).toBeInTheDocument();
  });

  it('hides the filter controls until the Filters button is pressed', async () => {
    show(data());
    expect(screen.queryByLabelText('Status')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide filters/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('restores the quick view and selection from the URL, so Back and reload keep the same decision context (W08)', async () => {
    h.reports = data();
    h.loading = false;
    h.error = null;
    render(<MemoryRouter initialEntries={['/dashboard?quick=verify&sel=b']}><ReportQueue /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Needs verification/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(preview()).getByRole('heading', { name: 'Fire report' })).toBeInTheDocument();
    expect(within(inbox()).queryByText('Flood A')).toBeNull();
  });

  it('searches the real report fields: place, description, type, and reference', async () => {
    show([
      makeReport({ id: 'a', description: 'Flood A', addressText: 'Riverside Road', reference: 'DR-AAAAAA' }),
      makeReport({ id: 'b', description: 'Fire B', addressText: 'Market Street', reference: 'DR-BBBBBB' }),
    ]);
    await userEvent.type(screen.getByLabelText('Search incidents'), 'market');
    expect(within(inbox()).queryByText('Flood A')).toBeNull();
    expect(within(inbox()).getByText('Fire B')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Search incidents'));
    await userEvent.type(screen.getByLabelText('Search incidents'), 'dr-aaaaaa');
    expect(within(inbox()).getByText('Flood A')).toBeInTheDocument();
    expect(within(inbox()).queryByText('Fire B')).toBeNull();
  });
  it('clears a search with no matches and returns focus to search', async () => {
    show(data());
    const search = screen.getByRole('searchbox', { name: 'Search incidents' });
    await userEvent.type(search, 'nothing-matches-this');
    expect(screen.getByText('No reports match this view')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    expect(search).toHaveValue('');
    expect(search).toHaveFocus();
    expect(within(inbox()).getAllByRole('button')).toHaveLength(2);
  });

});
