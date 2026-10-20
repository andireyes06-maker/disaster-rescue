import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../firebase-auth', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) }));
import AuditPage from './AuditPage';

// A request that never settles keeps the page in its loading state.
describe('AuditPage loading state', () => {
  it('reserves the table shape with a labelled status region, not a bare text line', () => {
    globalThis.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    const { container } = render(<AuditPage />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading the audit log');
    expect(container.querySelectorAll('.skeleton-block').length).toBeGreaterThan(0);
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });
});
