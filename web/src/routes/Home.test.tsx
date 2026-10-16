import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  });

  it('shows the landing page to a signed-out visitor without redirecting', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: 'Disaster Rescue Reporting and Monitoring System' })).toBeInTheDocument();
    expect(screen.queryByTestId('at')).toBeNull();
  });

  it('shows Loading while auth is still resolving, not the landing page', () => {
    auth.value = { user: null, role: null, loading: true };
    renderAt();
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it.each([
    ['dispatcher', '/dashboard'],
    ['dmo', '/monitor'],
    ['responder', '/assignments'],
  ])('sends a signed-in %s to their landing route', (role, path) => {
    auth.value = { user: { uid: 'u1' }, role, loading: false };
    renderAt();
    expect(screen.getByTestId('at')).toHaveTextContent(path);
  });

  it('sends a signed-in resident to /forbidden', () => {
    auth.value = { user: { uid: 'u1' }, role: 'resident', loading: false };
    renderAt();
    expect(screen.getByTestId('at')).toHaveTextContent('/forbidden');
  });
});
