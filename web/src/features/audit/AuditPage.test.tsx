import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../firebase', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) }));
import AuditPage from './AuditPage';

const ROWS = [
  {
    actorUid: 'u1',
    action: 'update_status',
    reportId: 'r1',
    at: '2026-01-02T10:00:00.000Z',
    before: { status: 'Submitted', note: 'old' },
    after: { status: 'Verified', note: '<script>alert(1)</script>' },
  },
];

function serveAudit(body: unknown) {
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof fetch;
}

describe('AuditPage', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('retries a failed load from the error banner', async () => {
    const user = userEvent.setup();
    let calls = 0;
    globalThis.fetch = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('network down');
      return { ok: true, status: 200, text: async () => JSON.stringify(ROWS) };
    }) as unknown as typeof fetch;

    render(<AuditPage />);
    await screen.findByText(/Could not load the audit log/);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('update_status')).toBeInTheDocument());
    expect(calls).toBe(2);
  });

  it('shows before and after values as plain text, never as markup', async () => {
    serveAudit(ROWS);
    const { container } = render(<AuditPage />);
    expect(await screen.findByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });

  it('sends the action filter to GET /api/audit', async () => {
    serveAudit([]);
    render(<AuditPage />);
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await userEvent.type(screen.getByLabelText('Action'), 'update_status');
    await waitFor(() => {
      const urls = vi.mocked(fetch).mock.calls.map((c) => String(c[0]));
      expect(urls.some((u) => u.includes('/audit?') && u.includes('action=update_status'))).toBe(true);
    });
  });
});
