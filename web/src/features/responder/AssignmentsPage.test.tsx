import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const state = vi.hoisted(() => ({
  team: 'team-a' as string | null,
  reports: [] as unknown[],
}));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ team: state.team }) }));
vi.mock('./useAssignedReports', () => ({
  useAssignedReports: () => ({ reports: state.reports, loading: false, error: null }),
}));

import AssignmentsPage from './AssignmentsPage';

const renderPage = () => render(<MemoryRouter><AssignmentsPage /></MemoryRouter>);

describe('AssignmentsPage empty states', () => {
  beforeEach(() => {
    state.team = 'team-a';
    state.reports = [];
  });

  it('explains when the account has no rescue team', () => {
    state.team = null;
    renderPage();
    expect(screen.getByRole('heading', { name: 'Your account is not linked to a rescue team' })).toBeInTheDocument();
  });

  it('says so when the team has no open assignments', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'No open assignments right now' })).toBeInTheDocument();
  });
});
