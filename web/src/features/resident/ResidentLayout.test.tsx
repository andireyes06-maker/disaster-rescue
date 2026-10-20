import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ logout: vi.fn(() => Promise.resolve()) }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ user: { email: 'ana@example.com' }, role: 'resident', logout: h.logout }) }));

vi.mock('./NotificationBell', () => ({ default: () => <button>Notifications</button> }));

import ResidentLayout from './ResidentLayout';

describe('ResidentLayout', () => {
  it('links to the resident pages and shows the brand', () => {
    render(<MemoryRouter><ResidentLayout title="Test page" description="Test description"><p>page body</p></ResidentLayout></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Rescue Reports home' })).toHaveAttribute('href', '/my');
    expect(screen.getByRole('link', { name: 'My reports' })).toHaveAttribute('href', '/my');
    expect(screen.getByRole('link', { name: 'Report an emergency' })).toHaveAttribute('href', '/my/report');
    expect(screen.getByText('page body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('exposes one banner landmark, the top bar', () => {
    render(<MemoryRouter><ResidentLayout title="Test page" description="Test description"><p>page body</p></ResidentLayout></MemoryRouter>);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Test page' })).toBeInTheDocument();
  });

  it('puts the page heading inside one main landmark that the skip link targets', () => {
    render(<MemoryRouter><ResidentLayout title="Test page" description="Test description"><p>page body</p></ResidentLayout></MemoryRouter>);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'resident-main');
    expect(main).toContainElement(screen.getByRole('heading', { level: 1, name: 'Test page' }));
    expect(main).toContainElement(screen.getByText('page body'));
  });

  it('signs the resident out', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ResidentLayout title="Test page" description="Test description"><p>page body</p></ResidentLayout></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(h.logout).toHaveBeenCalled();
  });
});
