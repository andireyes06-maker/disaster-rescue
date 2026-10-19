import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../firebase-auth', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) }));
import AnalyticsPage from './AnalyticsPage';

// A request that never settles keeps the page in its loading state.
describe('AnalyticsPage loading state', () => {
  it('reserves the chart shape with a labelled status region, not a bare text line', () => {
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    const { container } = render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('Loading analytics');
    expect(container.querySelectorAll('.skeleton-block').length).toBeGreaterThan(0);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
