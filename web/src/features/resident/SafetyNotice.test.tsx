import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SafetyNotice from './SafetyNotice';

describe('resident safety notice', () => {
  it('asks people to call only when a number is configured', () => {
    render(<SafetyNotice hotlines={{ numbers: [{ label: 'Rescue', number: '0917 000 1111' }], residentNotice: '' }} />);
    expect(screen.getByRole('heading', { name: 'If you are in danger, call now' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '0917 000 1111' })).toHaveAttribute('href', 'tel:09170001111');
  });

  it('gives neutral safety wording and no call prompt when no number is configured', () => {
    render(<SafetyNotice hotlines={{ numbers: [], residentNotice: '' }} />);
    expect(screen.getByRole('heading', { name: 'Safety information' })).toBeInTheDocument();
    expect(screen.queryByText(/call now/i)).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText(/call your local emergency number/)).toBeInTheDocument();
  });
});
