import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../firebase-auth', () => ({ getFirebaseAuth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) }));
import ExportButtons from './ExportButtons';

describe('ExportButtons', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:test');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      blob: async () => new Blob(['x']),
    })) as unknown as typeof fetch;
  });

  it('saves a demo export under the server filename, not the default', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-disposition': 'attachment; filename="demo-sample-incidents.csv"' }),
      blob: async () => new Blob(['reference']),
    })) as unknown as typeof fetch;
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.download);
    });
    render(<ExportButtons filters={{ from: '', to: '', type: '', status: '' }} />);
    await userEvent.click(screen.getByRole('button', { name: /download csv/i }));
    await screen.findByRole('button', { name: /download csv/i });
    expect(clicks).toEqual(['demo-sample-incidents.csv']);
  });

  it('requests the CSV with the current filters and a Bearer token', async () => {
    render(<ExportButtons filters={{ from: '2026-01-01', to: '2026-01-31', type: 'flood', status: '' }} />);
    await userEvent.click(screen.getByRole('button', { name: /download csv/i }));
    const [url, init] = vi.mocked(fetch).mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toMatch(/\/export\/incidents\.csv\?/);
    expect(url).toContain('from=2026-01-01');
    expect(url).toContain('to=2026-01-31');
    expect(url).toContain('type=flood');
    expect(url).not.toContain('status=');
    expect(url).not.toContain('tok');
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('requests the PDF summary with the same filters', async () => {
    render(<ExportButtons filters={{ from: '', to: '', type: '', status: 'Resolved' }} />);
    await userEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    const [url] = vi.mocked(fetch).mock.calls[0] as unknown as [string];
    expect(url).toMatch(/\/export\/summary\.pdf\?status=Resolved$/);
  });
  it('keeps focus during download and blocks another export until recovery', async () => {
    let reject!: (reason: Error) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    render(<ExportButtons filters={{ from: '', to: '', type: '', status: '' }} />);
    const csv = screen.getByRole('button', { name: /download csv/i });
    await userEvent.click(csv);
    expect(csv).toHaveFocus();
    expect(csv).toBeEnabled();
    expect(csv).toHaveAttribute('aria-busy', 'true');
    await userEvent.keyboard('{Enter}');
    await userEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    expect(fetch).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error('offline')));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not download');
    expect(csv).toHaveAttribute('aria-disabled', 'false');
  });

});
