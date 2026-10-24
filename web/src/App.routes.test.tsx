import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: unknown }) => children,
  useAuth: () => ({ user: null, role: null, loading: false, error: null, login: vi.fn(), logout: vi.fn() }),
}));
import App from './App';

describe('website routes after the mobile-app clarification', () => {
  it.each(['/register', '/my', '/my/report', '/my/reports/r1'])(
    '%s shows the mobile-app notice instead of a website page',
    async (path) => {
      render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
      expect(await screen.findByRole('heading', { name: 'Use the Rescue Reports mobile app' })).toBeInTheDocument();
    },
  );
});
