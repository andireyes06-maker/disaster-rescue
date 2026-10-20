import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../firebase-auth', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) }));
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
    globalThis.fetch = vi.fn(async (url) => {
      if (!String(url).includes('/audit')) return { ok: true, status: 200, text: async () => '[]' };
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

  it('shows readable names and references while retaining original identifiers', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      const path = String(url);
      const body = path.includes('/users') ? [{ uid: 'u1', name: 'Elena Cruz' }]
        : path.includes('/reports') ? [{ id: 'r1', reference: 'RR-260005' }]
        : path.includes('/teams') ? [{ id: 't1', name: 'Harbor Alpha' }]
        : [{ ...ROWS[0], action: 'report.assign', before: {}, after: { assignedTeamId: 't1' } }];
      return { ok: true, status: 200, text: async () => JSON.stringify(body) };
    }) as unknown as typeof fetch;
    render(<AuditPage />);
    expect(await screen.findByText('Team assigned')).toBeInTheDocument();
    expect(await screen.findByText('Elena Cruz')).toBeInTheDocument();
    expect(screen.getByText('RR-260005')).toBeInTheDocument();
    expect(screen.getByText('Harbor Alpha')).toBeInTheDocument();
    expect(screen.getByText('report.assign')).toBeInTheDocument();
    expect(screen.getByText('Action code').closest('details')).not.toHaveAttribute('open');
  });

  it('keeps audit records readable when name lookups fail', async () => {
    globalThis.fetch = vi.fn(async (url) => {
      if (!String(url).includes('/audit')) throw new Error('lookup unavailable');
      return { ok: true, status: 200, text: async () => JSON.stringify(ROWS) };
    }) as unknown as typeof fetch;
    render(<AuditPage />);
    expect(await screen.findByText('Update status')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Retry names' })).toBeInTheDocument();
    expect(screen.getAllByText('u1').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Could not load the audit log/)).not.toBeInTheDocument();
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
  it('treats a malformed response as an error, not an empty audit log', async () => {
    serveAudit({}); render(<AuditPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the audit log.');
  });
  it('rejects a reversed date range without requesting it', async () => {
    serveAudit([]); render(<AuditPage />);
    await screen.findByText('No audit entries match these filters');
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-17' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-01' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('The end date must be on or after the start date.');
    expect(screen.getByLabelText('To')).toHaveAttribute('aria-invalid', 'true');
    expect(vi.mocked(fetch).mock.calls.some(call => String(call[0]).includes('to=2026-10-01'))).toBe(false);
  });

});
