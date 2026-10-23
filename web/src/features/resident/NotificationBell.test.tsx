import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({
  state: { notifications: [] as { id: string; title: string; body: string; reportId: string; read: boolean; createdAt: Date }[], loading: false, error: null as unknown },
  api: vi.fn(),
}));
vi.mock('./useMyNotifications', () => ({ useMyNotifications: () => h.state }));
vi.mock('../../api/client', () => ({ api: h.api }));
import NotificationBell from './NotificationBell';

const sample = { id: 'n1', title: 'Report verified', body: 'Your flood report was verified.', reportId: 'r1', read: false, createdAt: new Date('2026-10-17T01:00:00Z') };
function renderBell() { return render(<MemoryRouter><NotificationBell uid="res-1" /></MemoryRouter>); }

describe('NotificationBell', () => {
  beforeEach(() => { h.state = { notifications: [], loading: false, error: null }; h.api.mockReset(); });

  it('keeps the list collapsed, shows unread count, and returns focus on Escape', async () => {
    h.state.notifications = [sample, { ...sample, id: 'n2', read: true }];
    const user = userEvent.setup(); renderBell();
    const trigger = screen.getByRole('button', { name: 'Notifications, 1 unread' });
    expect(screen.queryByText(sample.body)).not.toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getAllByText(sample.body)).toHaveLength(2);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('links to the report and closes the panel', async () => {
    h.state.notifications = [sample]; const user = userEvent.setup(); renderBell();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('link', { name: 'View report' })).toHaveAttribute('href', '/my/reports/r1');
    await user.click(screen.getByRole('link', { name: 'View report' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('marks read through the API and updates the unread count only after success', async () => {
    h.state.notifications = [sample]; h.api.mockResolvedValue({ read: true });
    const user = userEvent.setup(); renderBell();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    await user.click(screen.getByRole('button', { name: 'Mark as read: Report verified' }));
    expect(h.api).toHaveBeenCalledWith('/notifications/n1/read', { method: 'PATCH' });
    await waitFor(() => expect(screen.queryByRole('button', { name: /Mark as read/ })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('preserves unread state and allows retry when marking read fails', async () => {
    h.state.notifications = [sample]; h.api.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup(); renderBell();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    await user.click(screen.getByRole('button', { name: 'Mark as read: Report verified' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not mark');
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark as read: Report verified' })).toBeEnabled();
  });

  it('names the mark-as-read control with its visible words', async () => {
    h.state.notifications = [sample]; const user = userEvent.setup(); renderBell();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('button', { name: /^Mark as read/ })).toBeInTheDocument();
  });

  it('states unread in text, not only by color, and not on read items', async () => {
    h.state.notifications = [sample, { ...sample, id: 'n2', title: 'Team assigned', read: true }];
    const user = userEvent.setup(); renderBell();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getAllByText(/^Unread:/)).toHaveLength(1);
  });

  it('shows loading before an empty state and closes with its close button', async () => {
    h.state.loading = true; const user = userEvent.setup(); const view = renderBell();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('status')).toHaveTextContent('Loading notifications');
    expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument();
    h.state.loading = false;
    view.rerender(<MemoryRouter><NotificationBell uid="res-1" /></MemoryRouter>);
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close notifications' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('makes a subscription failure visible without pretending the inbox is empty', async () => {
    h.state.error = new Error('offline'); const user = userEvent.setup(); renderBell();
    await user.click(screen.getByRole('button', { name: 'Notifications, unavailable' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load notifications');
    expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument();
  });
  it('retains focus while saving, ignores repeat activation, and moves focus before removing the action', async () => {
    h.state.notifications = [sample];
    let resolve!: () => void;
    h.api.mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
    const user = userEvent.setup(); renderBell();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    const action = screen.getByRole('button', { name: /^Mark as read/ });
    await user.click(action);
    expect(action).toHaveFocus();
    expect(action).toBeEnabled();
    expect(action).toHaveAttribute('aria-busy', 'true');
    await user.keyboard('{Enter}{Enter}');
    expect(h.api).toHaveBeenCalledTimes(1);
    await act(async () => resolve());
    expect(action).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close notifications' })).toHaveFocus();
  });

  it('uses the caller-supplied report link for staff', async () => {
    h.state.notifications = [sample]; const user = userEvent.setup();
    render(<MemoryRouter><NotificationBell uid="staff-1" reportHref={(id) => `/incidents/${encodeURIComponent(id)}`} /></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('link', { name: 'View report' })).toHaveAttribute('href', '/incidents/r1');
  });

});
