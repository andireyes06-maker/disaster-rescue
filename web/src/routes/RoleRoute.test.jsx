import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const state = { value: {} };
vi.mock('../auth/AuthProvider.jsx', () => ({ useAuth: () => state.value }));
import RoleRoute from './RoleRoute.jsx';

function renderAt(auth) {
  state.value = auth;
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/forbidden" element={<p>forbidden page</p>} />
        <Route
          path="/dashboard"
          element={
            <RoleRoute allow={['dispatcher']}>
              <p>secret</p>
            </RoleRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RoleRoute', () => {
  it('shows loading while loading', () => {
    renderAt({ user: null, role: null, loading: true });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  it('redirects signed out to /login', () => {
    renderAt({ user: null, role: null, loading: false });
    expect(screen.getByText('login page')).toBeInTheDocument();
  });
  it('redirects wrong role to /forbidden', () => {
    renderAt({ user: { uid: 1 }, role: 'dmo', loading: false });
    expect(screen.getByText('forbidden page')).toBeInTheDocument();
  });
  it('renders for the right role', () => {
    renderAt({ user: { uid: 1 }, role: 'dispatcher', loading: false });
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
