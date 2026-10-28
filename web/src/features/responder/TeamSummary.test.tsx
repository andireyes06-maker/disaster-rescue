import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => vi.fn());
vi.mock('../../api/client', () => ({ api }));
import TeamSummary from './TeamSummary';
const totals = (open: number) => ({ teamId: 'a', total: 4, open, resolved: 1, peopleRescued: 2, byStatus: {} });
beforeEach(() => api.mockReset());
describe('TeamSummary', () => {
  it('keeps a visible failure and retries instead of disappearing', async () => {
    api.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(totals(3));
    render(<TeamSummary team="a" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading team totals');
    expect(await screen.findByRole('alert')).toHaveTextContent('Team totals could not refresh');
    await userEvent.click(screen.getByRole('button', { name: 'Retry totals' }));
    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('refreshes when the live report revision changes, preserving old counts during refresh', async () => {
    api.mockResolvedValueOnce(totals(3)).mockResolvedValueOnce(totals(2));
    const { rerender } = render(<TeamSummary team="a" revision="v1" />);
    await screen.findByText('3');
    rerender(<TeamSummary team="a" revision="v2" />);
    expect(screen.getByText('3')).toBeInTheDocument();
    await vi.waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(screen.queryByText('3')).toBeNull());
  });
  it('does not show another team’s totals while a new request is pending', async () => {
    let done: (data: unknown) => void = () => {};
    api.mockResolvedValueOnce(totals(3)).mockImplementationOnce(() => new Promise(resolve => { done = resolve; }));
    const { rerender } = render(<TeamSummary team="a" />);
    await screen.findByText('3');
    rerender(<TeamSummary team="b" />);
    expect(screen.queryByText('3')).toBeNull();
    await vi.waitFor(() => expect(api).toHaveBeenCalledTimes(2));
    await act(async () => done({ ...totals(5), teamId: 'b' }));
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});
