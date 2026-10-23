import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileAppNotice from './MobileAppNotice';

describe('MobileAppNotice', () => {
  it('tells residents and rescuers to use the mobile app', () => {
    render(<MemoryRouter><MobileAppNotice /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Use the Rescue Reports mobile app' })).toBeInTheDocument();
    expect(screen.getByText(/Residents and rescue teams use the mobile app/)).toBeInTheDocument();
    expect(screen.getByText(/The website is for administrators/)).toBeInTheDocument();
  });

  it('offers no resident or dashboard links, only home and administrator sign-in', () => {
    render(<MemoryRouter><MobileAppNotice /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Administrator sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: /my reports|report an|dashboard|assignment|register|create/i })).toBeNull();
  });
});
