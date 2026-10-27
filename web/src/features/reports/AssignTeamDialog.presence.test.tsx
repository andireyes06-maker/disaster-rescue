import type { ReactNode, Ref } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
// Simulates a presence layer that never finishes its CSS exit, as in the interrupted browser case.
vi.mock('../../components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogContent: ({ children, ref }: { children: ReactNode; ref?: Ref<HTMLDivElement> }) => <div ref={ref} role="dialog">{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));
vi.mock('../../api/client', () => ({ api: async () => [], ApiError: class extends Error {} }));
import AssignTeamDialog from './AssignTeamDialog';
afterEach(() => vi.useRealTimers());
describe('assignment exit safety', () => {
  it('releases a stuck closed dialog after the bounded exit window', async () => {
    vi.useFakeTimers();
    const view = render(<AssignTeamDialog open reportId="r1" onClose={() => {}} />);
    await act(async () => {});
    view.rerender(<AssignTeamDialog open={false} reportId="r1" onClose={() => {}} />);
    act(() => vi.advanceTimersByTime(299)); expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1)); expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('cancels the exit cleanup when the dialog reopens', async () => {
    vi.useFakeTimers();
    const view = render(<AssignTeamDialog open reportId="r1" onClose={() => {}} />);
    await act(async () => {});
    view.rerender(<AssignTeamDialog open={false} reportId="r1" onClose={() => {}} />);
    act(() => vi.advanceTimersByTime(100));
    view.rerender(<AssignTeamDialog open reportId="r1" onClose={() => {}} />);
    await act(async () => {});
    act(() => vi.advanceTimersByTime(500)); expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
