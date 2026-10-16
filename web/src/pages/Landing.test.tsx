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

  it('has a tel link for the placeholder hotline in the header', () => {
    renderLanding();
    const links = screen.getAllByRole('link', { name: 'Emergency hotline (placeholder)' });
    expect(links[0]).toHaveAttribute('href', 'tel:000-0000');
  });

  it('sends the staff door to /login', () => {
    renderLanding();
    for (const link of screen.getAllByRole('link', { name: 'Sign in to the staff web' })) {
      expect(link).toHaveAttribute('href', '/login');
    }
  });

  it('sends the resident door to the resident app section', () => {
    renderLanding();
    expect(screen.getByRole('link', { name: 'Get the resident app' })).toHaveAttribute('href', '#resident-app');
  });
});
