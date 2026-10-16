import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({
  value: { user: { email: 'd@test.dev' }, role: 'dispatcher', logout: vi.fn() } as {
    user: { email: string } | null; role: string | null; logout: () => Promise<void>;
  },
}));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => auth.value }));

import AppShell from './AppShell';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell title="Dashboard"><p>body</p></AppShell>
    </MemoryRouter>,
  );

describe('AppShell', () => {
  beforeEach(() => {
    auth.value = { user: { email: 'd@test.dev' }, role: 'dispatcher', logout: vi.fn() };
  });

  it('shows the dispatcher navigation', () => {
    renderAt('/dashboard');
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.querySelectorAll('a')).toHaveLength(6);
  });

  it('marks the current route with aria-current', () => {
    renderAt('/dashboard');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the signed-in role in the top bar', () => {
    renderAt('/dashboard');
    expect(screen.getByText('d@test.dev (dispatcher)')).toBeInTheDocument();
  });

  it('toggles the mobile menu with aria-expanded', async () => {
    renderAt('/dashboard');
    const toggle = screen.getByRole('button', { name: 'Menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
