import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({ role: null as string | null }));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ role: auth.role, user: null, logout: vi.fn() }) }));

import NotFound from './NotFound';

const renderPage = () => render(<MemoryRouter><NotFound /></MemoryRouter>);

describe('NotFound page', () => {
  it('tells an anonymous visitor the address is wrong and offers sign-in and home', () => {
    auth.role = null;
    renderPage();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  it('sends a signed-in administrator to their own page, not a silent redirect', () => {
    auth.role = 'admin';
    renderPage();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to my page' })).toHaveAttribute('href', '/dashboard');
  });

  it('offers no website page to a resident, who uses the mobile app', () => {
    auth.role = 'resident';
    renderPage();
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Go to my page' })).toBeNull();
  });
});
