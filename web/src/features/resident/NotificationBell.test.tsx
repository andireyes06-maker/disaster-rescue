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

  it('opening the panel marks unread notifications read through the API', async () => {
    h.state.notifications = [sample]; h.api.mockResolvedValue({ read: true });
    const user = userEvent.setup(); renderBell();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    await waitFor(() => expect(h.api).toHaveBeenCalledWith('/notifications/n1/read', { method: 'PATCH' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Notifications/ })).toHaveAccessibleName('Notifications'));
  });

  it('a failed save keeps the notification unread and says so', async () => {
    h.state.notifications = [sample]; h.api.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup(); renderBell();
    await user.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not mark the notification as read. Try again.');
    expect(screen.getByRole('button', { name: 'Notifications, 1 unread' })).toBeInTheDocument();
  });
});
