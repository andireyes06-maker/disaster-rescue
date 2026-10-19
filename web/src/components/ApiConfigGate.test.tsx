import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ApiConfigGate from './ApiConfigGate';

describe('ApiConfigGate', () => {
  it('shows a configuration error and no app when the API address is missing', () => {
    render(<ApiConfigGate value={undefined}><p>the app</p></ApiConfigGate>);
    expect(screen.queryByText('the app')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'The app cannot reach its server' })).toBeInTheDocument();
    expect(screen.getByText(/VITE_API_BASE_URL is not set/)).toBeInTheDocument();
    expect(screen.getByText(/web\/\.env\.local/)).toBeInTheDocument();
  });

  it('renders the app when the API address is configured', () => {
    render(<ApiConfigGate value="http://localhost:3000/api"><p>the app</p></ApiConfigGate>);
    expect(screen.getByText('the app')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'The app cannot reach its server' })).not.toBeInTheDocument();
  });
});
