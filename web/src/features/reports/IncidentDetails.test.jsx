import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { makeReport } from './fixtures.js';

const h = vi.hoisted(() => ({ auth: { role: 'dispatcher' }, reports: [], api: vi.fn() }));
vi.mock('../../auth/AuthProvider.jsx', () => ({ useAuth: () => h.auth }));
vi.mock('./useReports.js', () => ({ useReports: () => ({ reports: h.reports, loading: false, error: null }) }));
vi.mock('../../api/client.js', async () => {
  class ApiError extends Error {
    constructor({ status, code, message }) { super(message || code); this.status = status; this.code = code; }
  }
  return { api: h.api, ApiError };
});
import { ApiError } from '../../api/client.js';
import IncidentDetails from './IncidentDetails.jsx';

function show(reports, role = 'dispatcher', id = 'r1') {
  h.auth = { role };
  h.reports = reports;
  return render(
    <MemoryRouter initialEntries={[`/incidents/${id}`]}>
      <Routes><Route path="/incidents/:id" element={<IncidentDetails />} /></Routes>
    </MemoryRouter>,
  );
}

describe('IncidentDetails', () => {
  beforeEach(() => { h.api.mockReset(); h.api.mockResolvedValue({}); });

  it.each(['Submitted', 'Under Verification'])('shows Verify for %s', (status) => {
    show([makeReport({ status })]);
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
  });

  it('does not show Verify for Verified', () => {
    show([makeReport({ status: 'Verified', verified: true })]);
    expect(screen.queryByRole('button', { name: 'Verify' })).toBeNull();
    expect(screen.queryByRole('button', { name: /reject/i })).toBeNull();
  });

  it('shows no action buttons for dmo', () => {
    show([makeReport()], 'dmo');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows the duplicate banner only when flagged', () => {
    const other = makeReport({ id: 'r2', description: 'Same flood nearby' });
    const { unmount } = show([makeReport({ possibleDuplicates: ['r2'] }), other]);
    const banner = screen.getByRole('region', { name: /possible duplicates/i });
    expect(within(banner).getByText('Same flood nearby')).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: /mark as duplicate of this report/i })).toBeInTheDocument();
    unmount();
    show([makeReport(), other]);
    expect(screen.queryByRole('region', { name: /possible duplicates/i })).toBeNull();
  });

  it('marks a candidate as duplicate via PATCH', async () => {
    const other = makeReport({ id: 'r2' });
    show([makeReport({ possibleDuplicates: ['r2'] }), other]);
    await userEvent.click(screen.getByRole('button', { name: /mark as duplicate of this report/i }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/duplicate', { method: 'PATCH', body: { duplicateOf: 'r2' } });
  });

  it('keeps Reject confirm disabled until a reason is typed, then PATCHes', async () => {
    show([makeReport()]);
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /confirm reject/i });
    expect(confirm).toBeDisabled();
    const box = within(dialog).getByLabelText(/reason/i);
    await userEvent.type(box, '   ');
    expect(confirm).toBeDisabled();
    await userEvent.type(box, 'Prank call');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(h.api).toHaveBeenCalledWith('/reports/r1/reject', { method: 'PATCH', body: { reason: 'Prank call' } });
  });

  it('closes the dialog with Escape', async () => {
    show([makeReport()]);
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the conflict message on 409', async () => {
    h.api.mockRejectedValue(new ApiError({ status: 409, code: 'conflict' }));
    show([makeReport()]);
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(await screen.findByText(/Someone else already changed this report/)).toBeInTheDocument();
  });

  it('shows success after verify', async () => {
    show([makeReport()]);
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/verify', { method: 'PATCH' });
    expect(await screen.findByText(/verified/i, { selector: '[role="status"]' })).toBeInTheDocument();
  });

  it('sets priority and classification', async () => {
    show([makeReport()]);
    await userEvent.selectOptions(screen.getByLabelText(/priority/i), 'high');
    await userEvent.click(screen.getByRole('button', { name: 'Set priority' }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/priority', { method: 'PATCH', body: { priority: 'high' } });
    await userEvent.type(screen.getByLabelText(/classification/i), 'Rising river');
    await userEvent.click(screen.getByRole('button', { name: 'Classify' }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/classify', { method: 'PATCH', body: { classification: 'Rising river' } });
  });

  it('hides priority control for closed reports', () => {
    show([makeReport({ status: 'Closed' })]);
    expect(screen.queryByRole('button', { name: 'Set priority' })).toBeNull();
  });

  it('renders description as literal text', () => {
    const evil = '<img src=x onerror=alert(1)>';
    const { container } = show([makeReport({ description: evil })]);
    expect(screen.getByText(evil)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows not found for an unknown id', () => {
    show([makeReport()], 'dispatcher', 'nope');
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
