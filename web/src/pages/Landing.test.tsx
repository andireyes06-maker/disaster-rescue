import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';

const renderLanding = () => render(<MemoryRouter><Landing /></MemoryRouter>);

describe('Landing', () => {
  it('shows the safety text exactly', () => {
    renderLanding();
    expect(screen.getByText(
      'Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.',
    )).toBeInTheDocument();
  });

  it('shows an honest demo notice without a dialable placeholder hotline', () => {
    renderLanding();
    expect(screen.getByText('Demo site · hotline not configured')).toBeInTheDocument();
    expect(document.querySelector('a[href="tel:000-0000"]')).toBeNull();
  });

  it('sends the staff door to /login', () => {
    renderLanding();
    for (const link of screen.getAllByRole('link', { name: 'Sign in to the staff web' })) {
      expect(link).toHaveAttribute('href', '/login');
    }
  });

  it('sends the resident door to the resident app section', () => {
    renderLanding();
    expect(screen.getByRole('link', { name: 'Resident app availability' })).toHaveAttribute('href', '#resident-app');
  });
});
