import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ reports: [{ id: 'missing-pin', reference: 'RR-NOPIN', type: 'flood', priority: 'high', description: 'No coordinates', status: 'Team Assigned', createdAt: new Date(), updatedAt: new Date() }] }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ team: 'team-a' }) }));
vi.mock('./useAssignedReports', () => ({ useAssignedReports: () => ({ ...state, loading: false, error: null, fromCache: false, retry: vi.fn() }) }));
vi.mock('./useOwnTeam', () => ({ useOwnTeam: () => ({ team: null, loading: false, failed: false }) }));
vi.mock('./TeamIdentity', () => ({ default: () => null }));
vi.mock('./AssignmentMap', () => ({ AssignmentMap: () => <p>Team map</p>, validPoint: (p: {lat:number;lng:number} | undefined) => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng), directionsUrl: () => '' }));
import TeamMap from './TeamMap';
describe('TeamMap', () => {
  it('keeps coordinate-less assignments accessible without crashing a selected-pin deep link', () => {
    render(<MemoryRouter initialEntries={['/team-map?report=missing-pin']}><TeamMap /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('no valid map pin');
    expect(screen.getByText('RR-NOPIN').closest('a')).toHaveAttribute('href', '/assignments/missing-pin');
    expect(screen.queryByRole('region', { name: 'Selected assignment' })).toBeNull();
  });
});
