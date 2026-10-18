import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';

const state = vi.hoisted(() => ({
  team: 'team-a' as string | null,
  reports: [] as unknown[],
  ackAt: null as Date | null,
  ackLoading: false,
  ackError: false,
  api: vi.fn(),
}));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ team: state.team }) }));
vi.mock('./useAssignedReports', () => ({
  useAssignedReports: () => ({ reports: state.reports, loading: false, error: null }),
}));

vi.mock('../reports/useReport', () => ({ useAcknowledgedAt: () => ({ at: state.ackAt, acknowledged: !!state.ackAt, loading: state.ackLoading, error: state.ackError ? new Error('unavailable') : null }) }));
vi.mock('../../api/client', async (original) => ({ ...await original<typeof import('../../api/client')>(), api: state.api }));

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

describe('AssignmentsPage acknowledgement', () => {
  const report = {
    id: 'r1', type: 'flood', status: 'Team Assigned', priority: 'critical', description: 'Water on the ground floor.',
    addressText: 'Riverside District', location: null, createdAt: new Date('2026-10-12T10:00:00Z'),
  };
  beforeEach(() => {
    state.team = 'team-a';
    state.reports = [report];
    state.ackAt = null;
    state.ackLoading = false;
    state.ackError = false;
    state.api.mockReset().mockResolvedValue({});
  });

  it('offers Acknowledge until a responder has acknowledged', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument();
  });

  it('shows the acknowledgement time and no button once acknowledged', () => {
    state.ackAt = new Date('2026-10-17T10:00:00Z');
    renderPage();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(screen.getByText(/Acknowledged/)).toBeInTheDocument();
  });

  it('does not offer another acknowledgement before its history loads', () => {
    state.ackLoading = true;
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Checking acknowledgement');
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
  });

  it('does not treat failed history reads as an unacknowledged assignment', () => {
    state.ackError = true;
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not check acknowledgement');
    expect(screen.getByRole('button', { name: 'Reload assignments' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
  });

  it('keeps the confirmed acknowledgement when its stream has not caught up', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(await screen.findByText('Acknowledged')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument();
    expect(state.api).toHaveBeenCalledTimes(1);
  });
});
