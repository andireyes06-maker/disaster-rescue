import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', async () => {
  class ApiError extends Error {
    status: number;
    code: string | undefined;
    constructor({ status, code, message }: { status: number; code?: string; message?: string }) {
      super(message || code);
      this.status = status;
      this.code = code;
    }
  }
  return { api: h.api, ApiError };
});
vi.mock('./useReport', () => ({ useReportUpdates: () => ({ updates: [], error: null, retry: () => {} }) }));

import { ApiError } from '../../api/client';
import IncidentPreview from './IncidentPreview';
import SubmitterProfileDialog from './SubmitterProfileDialog';
import { makeReport } from './fixtures';

const MARIA = { uid: 'res-42', name: 'Maria Santos', email: 'maria@x.test', phone: '+639170000000', role: 'resident', active: true, photoUrl: null };

beforeEach(() => { h.api.mockReset(); });

describe('SubmitterProfileDialog (W4)', () => {
  it('opens the profile of reporterId even when the contact person is someone else', async () => {
    h.api.mockResolvedValue(MARIA);
    const report = makeReport({ reporterId: 'res-42', contact: { name: 'Ana', phone: '555-0100' } });
    render(<MemoryRouter><IncidentPreview report={report} role="admin" reporter={{ name: 'Maria Santos' }} canAct outsideFilters={false} onClearFilters={() => {}} /></MemoryRouter>);
    expect(h.api).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'View submitter profile' }));
    await screen.findByText('maria@x.test');
    expect(h.api).toHaveBeenCalledTimes(1);
    expect(h.api.mock.calls[0][0]).toBe('/users/res-42');
    expect(String(h.api.mock.calls[0][0])).not.toContain('Ana');
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Maria Santos');
    expect(dialog).toHaveTextContent('+639170000000');
    expect(dialog).toHaveTextContent('Resident');
    expect(dialog).toHaveTextContent('Active');
  });

  it('shows "This profile is unavailable." for a 404', async () => {
    h.api.mockRejectedValue(new ApiError({ status: 404, code: 'not_found' }));
    render(<SubmitterProfileDialog reporterId="gone-1" role="admin" />);
    await userEvent.click(screen.getByRole('button', { name: 'View submitter profile' }));
    expect(await screen.findByText('This profile is unavailable.')).toBeInTheDocument();
  });

  it('shows an error with a retry for other failures', async () => {
    h.api.mockRejectedValueOnce(new ApiError({ status: 0, code: 'network' })).mockResolvedValueOnce({ ...MARIA, active: false, role: 'admin' });
    render(<SubmitterProfileDialog reporterId="res-42" role="admin" />);
    await userEvent.click(screen.getByRole('button', { name: 'View submitter profile' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog).toHaveTextContent('Disabled'));
    expect(dialog).toHaveTextContent('Administrator');
  });

  it('focus returns to the name button on close', async () => {
    h.api.mockResolvedValue(MARIA);
    render(<SubmitterProfileDialog reporterId="res-42" role="admin" />);
    const opener = screen.getByRole('button', { name: 'View submitter profile' });
    await userEvent.click(opener);
    await screen.findByText('maria@x.test');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('no button when the report has no reporterId', () => {
    render(<MemoryRouter><IncidentPreview report={makeReport({ reporterId: undefined })} role="admin" canAct outsideFilters={false} onClearFilters={() => {}} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'View submitter profile' })).toBeNull();
  });

  it('no button for roles other than administrator', () => {
    const { rerender } = render(<SubmitterProfileDialog reporterId="res-42" role="responder" />);
    expect(screen.queryByRole('button', { name: 'View submitter profile' })).toBeNull();
    rerender(<SubmitterProfileDialog reporterId="res-42" role={null} />);
    expect(screen.queryByRole('button', { name: 'View submitter profile' })).toBeNull();
  });
});
