import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({
  value: { user: { email: 'a@test.dev' }, role: 'admin', logout: vi.fn() } as {
    user: { email: string } | null; role: string | null; logout: () => Promise<void>;
  },
}));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => auth.value }));
const demo = vi.hoisted(() => ({ value: null as { label: string } | null }));
vi.mock('../features/demo/useDemoIndicator', () => ({ useDemoIndicator: () => demo.value }));

import AppShell from './AppShell';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell title="Dashboard"><p>body</p></AppShell>
    </MemoryRouter>,
  );

describe('AppShell', () => {
  beforeEach(() => {
    auth.value = { user: { email: 'a@test.dev' }, role: 'admin', logout: vi.fn() };
  });

  it('shows the admin navigation', () => {
    renderAt('/dashboard');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.querySelectorAll('a')).toHaveLength(8);
  });

  it('marks the current route with aria-current', () => {
    renderAt('/dashboard');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the signed-in role in the top bar', () => {
    renderAt('/dashboard');
    expect(screen.getByText('a@test.dev (admin)')).toBeInTheDocument();
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
  it('gives an admin no Assignments link: the website has no responder pages', () => {
    auth.value = { user: { email: 'a@test.dev' }, role: 'admin', logout: vi.fn() };
    render(<MemoryRouter initialEntries={['/admin']}><AppShell title="Admin"><div /></AppShell></MemoryRouter>);
    expect(screen.queryByRole('link', { name: 'Assignments' })).toBeNull();
  });

  it('shows an admin every staff page, plus Admin', () => {
    auth.value = { user: { email: 'a@test.dev' }, role: 'admin', logout: vi.fn() };
    renderAt('/dashboard');
    const names = [...screen.getByRole('navigation', { name: 'Main' }).querySelectorAll('a')].map((a) => a.textContent);
    for (const label of ['Dashboard', 'Map', 'Monitor', 'Analytics', 'Audit', 'Teams', 'Users', 'Admin']) {
      expect(names).toContain(label);
    }
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
});
