import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { makeReport } from './fixtures';
import type { Report } from '../../types/domain';

const h = vi.hoisted(() => ({
  reports: [] as Report[],
  loading: false,
  error: null as Error | null,
}));
vi.mock('./useReports', () => ({ useReports: () => ({ reports: h.reports, loading: h.loading, error: h.error }) }));
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

describe('ReportQueue', () => {
  it('shows the empty state', () => {
    show([]);
    expect(screen.getByText(/no reports match/i)).toBeInTheDocument();
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

  it('rows link to incident details', () => {
    show(data());
    expect(screen.getByRole('link', { name: /Flood A/ })).toHaveAttribute('href', '/incidents/a');
  });

  it('computes summary cards', () => {
    show(data());
    const card = (name: string) => document.querySelector('.summary')?.textContent?.match(new RegExp(`${name}(\\d+)`))?.[1];
    expect(card('All reports')).toBe('2');
    expect(card('Open')).toBe('2');
    expect(card('Critical')).toBe('1');
    expect(card('Verified')).toBe('1');
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
    expect(screen.queryByText('Flood A')).toBeNull();
    expect(screen.getByText('Fire B')).toBeInTheDocument();
  });

  it('hides the filter controls until the Filters button is pressed', async () => {
    show(data());
    expect(screen.queryByLabelText('Status')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide filters/ })).toHaveAttribute('aria-expanded', 'true');
  });
});
