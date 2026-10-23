import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const auth = vi.hoisted(() => ({
  value: { user: null, role: null, loading: false } as { user: unknown; role: string | null; loading: boolean },
}));
vi.mock('../auth/AuthProvider', () => ({ useAuth: () => auth.value }));

import Home from './Home';

function Probe() {
  const location = useLocation();
  return <p data-testid="at">{location.pathname}</p>;
}

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('Home at /', () => {
  beforeEach(() => {
    auth.value = { user: null, role: null, loading: false };
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('shows the landing page to a signed-out visitor without redirecting', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: /Report clearly/ })).toBeInTheDocument();
    expect(screen.queryByTestId('at')).toBeNull();
  });

  it('reserves the public opening while the saved session resolves', () => {
    auth.value = { user: null, role: null, loading: true };
    renderAt();
    expect(screen.getByRole('status')).toHaveTextContent('Loading your session…');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.queryByRole('heading', { name: /Report clearly/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Create a resident account/ })).toBeNull();
  });

  it.each([
    ['dispatcher', '/forbidden'],
    ['dmo', '/forbidden'],
    ['responder', '/forbidden'],
  ])('sends a signed-in %s to their landing route', (role, path) => {
    auth.value = { user: { uid: 'u1' }, role, loading: false };
    renderAt();
    expect(screen.getByTestId('at')).toHaveTextContent(path);
  });

  it('sends a signed-in resident to the mobile-app notice, not a website page', () => {
    auth.value = { user: { uid: 'u1' }, role: 'resident', loading: false };
    renderAt();
    expect(screen.getByTestId('at')).toHaveTextContent('/forbidden');
  });
});
