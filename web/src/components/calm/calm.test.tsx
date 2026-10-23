import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Banner from './Banner';
import EmptyState from './EmptyState';

describe('Banner', () => {
  it('uses role alert for error banners when asked', () => {
    render(<Banner tone="error" role="alert">Could not save.</Banner>);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save.');
  });
});

describe('EmptyState', () => {
  it('renders title, body, and the next step', () => {
    render(<EmptyState title="No reports" body="New reports appear here." action={<a href="/map">Open map</a>} />);
    expect(screen.getByRole('heading', { name: 'No reports' })).toBeInTheDocument();
    expect(screen.getByText('New reports appear here.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open map' })).toBeInTheDocument();
  });
});
