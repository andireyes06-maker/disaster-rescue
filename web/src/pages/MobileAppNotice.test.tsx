import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileAppNotice from './MobileAppNotice';

describe('MobileAppNotice', () => {
  it('tells residents to use the mobile app and points staff to the website', () => {
    render(<MemoryRouter><MobileAppNotice /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Use the Rescue Reports mobile app' })).toBeInTheDocument();
    expect(screen.getByText(/Residents use the mobile app/)).toBeInTheDocument();
    expect(screen.getByText(/The website is for administrators and rescue teams/)).toBeInTheDocument();
  });

  it('offers no resident or dashboard links, only home and sign-in', () => {
    render(<MemoryRouter><MobileAppNotice /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: /my reports|report an|dashboard|assignment|register|create/i })).toBeNull();
  });
});
