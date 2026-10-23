import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const state = vi.hoisted(() => ({
  updates: [] as unknown[],
  loading: false,
  error: null as Error | null,
  hasMore: false,
  retry: vi.fn(),
  loadOlder: vi.fn(),
}));
vi.mock('../reports/useReport', () => ({
  useReportUpdates: () => ({ updates: state.updates, loading: state.loading, error: state.error, hasMore: state.hasMore, retry: state.retry, loadOlder: state.loadOlder }),
}));

import AssignedProgress, { progressSectionId } from './AssignedProgress';

const at = new Date('2026-10-19T09:00:00+08:00');
const entry = (id: string, note: string, extra: Partial<{ status: string; peopleRescued: number }> = {}) => ({
  id, status: extra.status ?? 'Rescue in Progress', note, peopleRescued: extra.peopleRescued ?? 0, at,
});

describe('AssignedProgress', () => {
  beforeEach(() => {
    state.updates = []; state.loading = false; state.error = null; state.hasMore = false;
    state.retry.mockReset(); state.loadOlder.mockReset();
  });

  it('is a labelled, read-only section whose heading can take focus', () => {
    render(<AssignedProgress reportId="r1" />);
    const section = document.getElementById(progressSectionId('r1'));
    expect(section).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Progress history' })).toBe(section);
    expect(screen.getByRole('heading', { name: 'Progress history' })).toHaveAttribute('tabindex', '-1');
    expect(within(section!).queryByRole('textbox')).toBeNull();
    expect(within(section!).queryByRole('button', { name: /submit|post|save/i })).toBeNull();
  });

  it('says when it is loading and when no entries exist yet', () => {
    state.loading = true;
    const { unmount } = render(<AssignedProgress reportId="r1" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading progress history');
    unmount();
    state.loading = false;
    render(<AssignedProgress reportId="r1" />);
    expect(screen.getByText('No progress entries have been recorded yet.')).toBeInTheDocument();
  });

  it('shows the error with a retry that re-reads the history', async () => {
    state.error = new Error('permission-denied');
    render(<AssignedProgress reportId="r1" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the progress history.');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.retry).toHaveBeenCalledTimes(1);
  });

  it('lists a saved update exactly once', () => {
    state.updates = [entry('upd-1', 'Crew reached the family', { peopleRescued: 2 })];
    render(<AssignedProgress reportId="r1" />);
    expect(screen.getAllByText('Crew reached the family')).toHaveLength(1);
    expect(screen.getByText(/2 rescued/)).toBeInTheDocument();
  });

  it('shortens a long note behind a disclosure and keeps the full text', () => {
    const long = 'a'.repeat(300);
    state.updates = [entry('upd-2', long)];
    render(<AssignedProgress reportId="r1" />);
    expect(screen.getByText('Show full note')).toBeInTheDocument();
    expect(screen.getAllByText(long)).toHaveLength(1);
  });

  it('offers older entries only when the window is full, and loads them on request', async () => {
    state.updates = [entry('upd-3', 'Newest')];
    state.hasMore = true;
    render(<AssignedProgress reportId="r1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Load older updates' }));
    expect(state.loadOlder).toHaveBeenCalledTimes(1);
  });
});
