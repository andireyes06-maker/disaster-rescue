import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Sign-in, registration, and Forbidden share one contract: a skip link to a real
// main landmark, and a page-specific document title.
const h = vi.hoisted(() => ({ user: null as unknown, role: null as string | null }));
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ user: h.user, role: h.role, loading: false, error: null, login: vi.fn(), logout: vi.fn() }),
}));
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../firebase-auth', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('../api/client', () => ({ api: vi.fn() }));

import LoginPage from '../features/auth/LoginPage';
import ResidentSignUp from '../features/resident/ResidentSignUp';
import Forbidden from './Forbidden';

function expectSkipToMain() {
  expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main-content');
  const target = document.getElementById('main-content');
  expect(target).not.toBeNull();
  expect(target?.tagName).toBe('MAIN');
}

describe('access page landmarks', () => {
  it('sign-in has a skip link to the main landmark and its own title', () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    expectSkipToMain();
    expect(document.title).toBe('Sign in · Rescue Reports');
  });

  it('registration has a skip link to the main landmark and its own title', () => {
    render(<MemoryRouter><ResidentSignUp /></MemoryRouter>);
    expectSkipToMain();
    expect(document.title).toBe('Create a resident account · Rescue Reports');
  });

  it('Forbidden has a skip link to the main landmark and its own title', () => {
    h.user = null;
    h.role = null;
    render(<MemoryRouter><Forbidden /></MemoryRouter>);
    expectSkipToMain();
    expect(document.title).toBe('Access denied · Rescue Reports');
  });
});
