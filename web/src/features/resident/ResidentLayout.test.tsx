import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ logout: vi.fn(() => Promise.resolve()) }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { email: 'ana@example.com' }, role: 'resident', logout: h.logout }) }));

import ResidentLayout from './ResidentLayout';

describe('ResidentLayout', () => {
  it('links to the resident pages and shows the brand', () => {
    render(<MemoryRouter><ResidentLayout><p>page body</p></ResidentLayout></MemoryRouter>);
    expect(screen.getByText('Rescue Reports')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My reports' })).toHaveAttribute('href', '/my');
    expect(screen.getByRole('link', { name: 'Report an emergency' })).toHaveAttribute('href', '/my/report');
    expect(screen.getByText('page body')).toBeInTheDocument();
  });

  it('signs the resident out', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ResidentLayout><p>page body</p></ResidentLayout></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(h.logout).toHaveBeenCalled();
  });
});
