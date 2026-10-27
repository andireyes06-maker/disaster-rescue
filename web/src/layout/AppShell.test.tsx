import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({
  value: { user: { uid: 'd-1', email: 'd@test.dev' }, role: 'admin', logout: vi.fn() } as {
    user: { uid?: string; email: string } | null; role: string | null; logout: () => Promise<void>;
  },
}));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => auth.value }));
const demo = vi.hoisted(() => ({ value: null as { label: string } | null }));
vi.mock('../features/demo/useDemoIndicator', () => ({ useDemoIndicator: () => demo.value }));
const notifications = vi.hoisted(() => ({ value: [] as { id: string; title: string; body: string; reportId: string; read: boolean; createdAt: Date }[] }));
vi.mock('../features/resident/useMyNotifications', () => ({
  useMyNotifications: () => ({ notifications: notifications.value, loading: false, error: null }),
}));

import AppShell from './AppShell';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell title="Dashboard"><p>body</p></AppShell>
    </MemoryRouter>,
  );

describe('AppShell', () => {
  beforeEach(() => {
    auth.value = { user: { uid: 'd-1', email: 'd@test.dev' }, role: 'admin', logout: vi.fn() };
    notifications.value = [];
  });

  it('shows the administrator navigation', () => {
    renderAt('/dashboard');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.querySelectorAll('a')).toHaveLength(7);
  });

  it('marks the current route with aria-current', () => {
    renderAt('/dashboard');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the signed-in role in the top bar', () => {
    renderAt('/dashboard');
    expect(screen.getByText('d@test.dev (admin)')).toBeInTheDocument();
  });

  it('toggles the mobile menu with aria-expanded', async () => {
    renderAt('/dashboard');
    const toggle = screen.getByRole('button', { name: 'Menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(screen.getByRole('link', { name: 'Map' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
  it('shows the admin navigation to an admin', () => {
    auth.value = { user: { email: 'a@test.dev' }, role: 'admin', logout: vi.fn() };
    renderAt('/admin');
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('shows no staff navigation to a resident', () => {
    auth.value = { user: { email: 'r@test.dev' }, role: 'resident', logout: vi.fn() };
    renderAt('/my');
    expect(screen.getByRole('navigation', { name: 'Main' }).querySelectorAll('a')).toHaveLength(0);
  });
  it('shows an admin every staff page, plus Admin', () => {
    auth.value = { user: { email: 'a@test.dev' }, role: 'admin', logout: vi.fn() };
    renderAt('/dashboard');
    const names = [...screen.getByRole('navigation', { name: 'Main' }).querySelectorAll('a')].map((a) => a.textContent);
    for (const label of ['Dashboard', 'Map', 'Analytics', 'Audit', 'Teams', 'Users', 'Admin']) {
      expect(names).toContain(label);
    }
  });

  it('does not list Assignments in the admin navigation', () => {
    auth.value = { user: { uid: 'a-1', email: 'a@test.dev' }, role: 'admin', logout: vi.fn() };
    renderAt('/admin');
    expect(screen.queryByRole('link', { name: 'Assignments' })).not.toBeInTheDocument();
  });

  it('gives a responder only the Assignments website navigation', () => {
    auth.value = { user: { uid: 'f-1', email: 'f@test.dev' }, role: 'responder', logout: vi.fn() };
    renderAt('/assignments');
    const links = screen.getByRole('navigation', { name: 'Main' }).querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/assignments');
  });

  it('mounts the notification bell in the staff header', () => {
    renderAt('/dashboard');
    expect(screen.getByRole('button', { name: /^Notifications/ })).toBeInTheDocument();
  });

  it('links responder notifications to the report on the responder assignment route', async () => {
    auth.value = { user: { uid: 'f-1', email: 'f@test.dev' }, role: 'responder', logout: vi.fn() };
    notifications.value = [{ id: 'n1', title: 'Team assigned', body: 'Review your assignment.', reportId: 'r1', read: false, createdAt: new Date('2026-10-17T01:00:00Z') }];
    renderAt('/assignments');
    await userEvent.click(screen.getByRole('button', { name: /^Notifications/ }));
    expect(screen.getByRole('link', { name: 'View report' })).toHaveAttribute('href', '/assignments/r1');
  });

  it('links a staff notification to the incident page', async () => {
    notifications.value = [{ id: 'n1', title: 'New report', body: 'A flood was reported.', reportId: 'r1', read: false, createdAt: new Date('2026-10-17T01:00:00Z') }];
    const user = userEvent.setup();
    renderAt('/dashboard');
    await user.click(screen.getByRole('button', { name: /^Notifications/ }));
    expect(screen.getByRole('link', { name: 'View report' })).toHaveAttribute('href', '/incidents/r1');
  });
});

describe('AppShell workspace copy', () => {
  it('does not render an environment label in the product header', () => {
    demo.value = { label: 'Demo workspace · Sample data' };
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppShell title="Dashboard"><p>body</p></AppShell>
      </MemoryRouter>,
    );
    expect(screen.queryByText('Demo workspace · Sample data')).not.toBeInTheDocument();
    demo.value = null;
  });

  it('announces a sign-out that fails instead of swallowing it', async () => {
    auth.value = { ...auth.value, logout: vi.fn(async () => { throw new Error('offline'); }) };
    renderAt('/dashboard');
    await userEvent.click(screen.getAllByRole('button', { name: 'Sign out' })[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign out. Check your connection and try again.');
  });
});
