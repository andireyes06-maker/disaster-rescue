import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
import OperationForm, { allowedOperationStatuses } from './OperationForm';
import { resetDraftStoreForTests, setIdentity } from './draftStore';

describe('OperationForm', () => {
  beforeEach(() => { h.api.mockReset(); h.api.mockResolvedValue({}); resetDraftStoreForTests(); });

  it.each(['-1', '2.5', 'many', '10001'])('blocks people rescued of %s without calling the API', async (value) => {
    render(<OperationForm reportId="r1" />);
    const count = screen.getByLabelText(/people rescued/i);
    await userEvent.clear(count);
    await userEvent.type(count, value);
    await userEvent.click(screen.getByRole('button', { name: /submit update/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/whole number from 0 to 10000/i);
    expect(h.api).not.toHaveBeenCalled();
  });

  it('submits a valid update with status, people rescued and note', async () => {
    render(<OperationForm reportId="r1" />);
    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'Resolved');
    const count = screen.getByLabelText(/people rescued/i);
    await userEvent.clear(count);
    await userEvent.type(count, '12');
    await userEvent.type(screen.getByLabelText(/notes/i), 'Family moved to the shelter');
    await userEvent.click(screen.getByRole('button', { name: /submit update/i }));
    expect(h.api).toHaveBeenCalledWith('/reports/r1/updates', {
      method: 'POST',
      headers: { 'Idempotency-Key': expect.any(String) },
      body: { status: 'Resolved', peopleRescued: 12, note: 'Family moved to the shelter' },
    });
  });

  it('keeps focus and blocks repeat posts, then clears saved feedback when a new draft starts', async () => {
    let finish!: () => void;
    h.api.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<OperationForm reportId="r1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    const posting = await screen.findByRole('button', { name: 'Posting update…' });
    expect(posting).toHaveFocus();
    await userEvent.click(posting);
    expect(h.api).toHaveBeenCalledTimes(1);
    await act(async () => { finish(); });
    expect(await screen.findByRole('status')).toHaveTextContent('Update saved.');
    await userEvent.type(screen.getByLabelText(/notes/i), 'New draft');
    expect(screen.queryByText('Update saved.')).not.toBeInTheDocument();
  });

  it('keeps a note typed while the post is pending after the post succeeds', async () => {
    let finish!: () => void;
    h.api.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<OperationForm reportId="r1" />);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Family moved');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    await screen.findByRole('button', { name: 'Posting update…' });
    await userEvent.type(screen.getByLabelText(/notes/i), ' to the shelter');
    await act(async () => { finish(); });
    expect(await screen.findByRole('status')).toHaveTextContent('Update saved.');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Family moved to the shelter');
    expect(h.api).toHaveBeenCalledWith('/reports/r1/updates', {
      method: 'POST',
      headers: { 'Idempotency-Key': expect.any(String) },
      body: { status: 'Rescue in Progress', peopleRescued: 0, note: 'Family moved' },
    });
  });

  it('a retry of an unchanged update after a timeout sends the same Idempotency-Key', async () => {
    h.api.mockRejectedValueOnce(Object.assign(new Error('timeout'), { status: 0, code: 'timeout' }));
    h.api.mockResolvedValueOnce({});
    render(<OperationForm reportId="r1" />);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Family moved');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Update saved.');
    expect(h.api).toHaveBeenCalledTimes(2);
    const keys = h.api.mock.calls.map(call => call[1].headers['Idempotency-Key']);
    expect(keys[0]).toEqual(keys[1]);
  });

  it.each([
    ['a lost reply (network)', { status: 0, code: 'network' }],
    ['a timed-out reply', { status: 0, code: 'timeout' }],
    ['a server error', { status: 500, code: 'internal_error' }],
    ['a rate limit', { status: 429, code: 'rate_limited' }],
  ])('%s says the update may be saved, keeps the entries, and does not blame the connection', async (_label, failure) => {
    h.api.mockRejectedValueOnce(Object.assign(new Error(failure.code), failure));
    render(<OperationForm reportId="r1" />);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Family moved');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t confirm whether your update was saved. Your entries are still here. Retry without changing them, or check the report history.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Network error');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Family moved');
  });

  it('the report-history phrase is a link to this assignment’s progress section, which takes focus', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const section = document.createElement('section');
    section.id = 'progress-history-r1';
    const heading = document.createElement('h3');
    heading.id = 'progress-history-r1-heading';
    heading.tabIndex = -1;
    section.appendChild(heading);
    document.body.appendChild(section);
    h.api.mockRejectedValueOnce(Object.assign(new Error('network'), { status: 0, code: 'network' }));
    render(<OperationForm reportId="r1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    const link = await screen.findByRole('link', { name: 'check the report history' });
    expect(link).toHaveAttribute('href', '#progress-history-r1');
    await userEvent.click(link);
    expect(scrollIntoView).toHaveBeenCalled();
    expect(document.getElementById('progress-history-r1-heading')).toHaveFocus();
    expect(window.location.hash).toBe('#progress-history-r1');
    document.getElementById('progress-history-r1')?.remove();
  });

  it('a closed report keeps the entries read-only and sends nothing', async () => {
    render(<OperationForm reportId="r1" reportStatus="Resolved" closed />);
    expect(screen.getByRole('status')).toHaveTextContent('This report is now Resolved, so new updates are closed.');
    expect(screen.getByLabelText(/notes/i)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/people rescued/i)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^status/i)).toHaveDisplayValue('Resolved');
    expect(screen.getByRole('button', { name: 'Submit update' })).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    expect(h.api).not.toHaveBeenCalled();
  });

  it('after a lost reply, a report that closed can still retry the same update with the same key', async () => {
    h.api.mockRejectedValueOnce(Object.assign(new Error('network'), { status: 0, code: 'network' }));
    h.api.mockResolvedValueOnce({});
    const { rerender } = render(<OperationForm reportId="r1" reportStatus="Rescue in Progress" />);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Family moved');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    await screen.findByRole('alert');
    rerender(<OperationForm reportId="r1" reportStatus="Resolved" closed />);
    expect(screen.getByRole('button', { name: 'Submit update' })).toHaveAttribute('aria-disabled', 'false');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Family moved');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    expect(await screen.findByText('Update saved.')).toBeInTheDocument();
    const keys = h.api.mock.calls.map(call => call[1].headers['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toEqual(keys[1]);
  });

  it('a responder who is no longer on the assigned team is told so, not sent the generic copy', async () => {
    h.api.mockRejectedValueOnce(Object.assign(new Error('not found'), { status: 404, code: 'not_found' }));
    render(<OperationForm reportId="r1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This report is no longer assigned to your team.');
  });

  it('a draft survives the form unmounting and is shown again on return', async () => {
    const first = render(<OperationForm reportId="r1" />);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Kept note');
    first.unmount();
    render(<OperationForm reportId="r1" />);
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Kept note');
  });

  it('an identity change while the form is open empties its fields', async () => {
    setIdentity('ana|responder|alpha');
    render(<OperationForm reportId="r1" />);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Ana note');
    act(() => setIdentity('ben|responder|alpha'));
    expect(screen.getByLabelText(/notes/i)).toHaveValue('');
  });

  it('after a lost reply, the retry reuses the same key even across a remount', async () => {
    h.api.mockRejectedValueOnce(Object.assign(new Error('network'), { status: 0, code: 'network' }));
    h.api.mockResolvedValueOnce({});
    const first = render(<OperationForm reportId="r1" />);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Family moved');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    await screen.findByRole('alert');
    first.unmount();
    render(<OperationForm reportId="r1" />);
    expect(screen.getByLabelText(/notes/i)).toHaveValue('Family moved');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    expect(await screen.findByText('Update saved.')).toBeInTheDocument();
    const keys = h.api.mock.calls.map(call => call[1].headers['Idempotency-Key']);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toEqual(keys[1]);
  });

  it('an identity change drops the uncertain attempt, so a later submit uses a new key', async () => {
    setIdentity('ana|responder|alpha');
    h.api.mockRejectedValueOnce(Object.assign(new Error('network'), { status: 0, code: 'network' }));
    h.api.mockResolvedValueOnce({});
    render(<OperationForm reportId="r1" />);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Family moved');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    await screen.findByRole('alert');
    act(() => setIdentity('ana|responder|bravo'));
    expect(screen.getByLabelText(/notes/i)).toHaveValue('');
    await userEvent.type(screen.getByLabelText(/notes/i), 'Family moved');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    expect(await screen.findByText('Update saved.')).toBeInTheDocument();
    const keys = h.api.mock.calls.map(call => call[1].headers['Idempotency-Key']);
    expect(keys[0]).not.toEqual(keys[1]);
  });

  it('a conflict keeps its own message rather than the unconfirmed-save copy', async () => {
    h.api.mockRejectedValueOnce(Object.assign(new Error('conflict'), { status: 409, code: 'illegal_transition' }));
    render(<OperationForm reportId="r1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This report can no longer be updated. Reload the page to see its latest status.');
  });

  it('an edited update after a failed attempt gets a new Idempotency-Key', async () => {
    h.api.mockRejectedValueOnce(Object.assign(new Error('timeout'), { status: 0, code: 'timeout' }));
    h.api.mockResolvedValueOnce({});
    render(<OperationForm reportId="r1" />);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Family moved');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    await screen.findByRole('alert');
    await userEvent.type(screen.getByLabelText(/notes/i), ' to the shelter');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Update saved.');
    const keys = h.api.mock.calls.map(call => call[1].headers['Idempotency-Key']);
    expect(keys[0]).not.toEqual(keys[1]);
  });

  it('clears the note that was submitted once the post succeeds', async () => {
    h.api.mockResolvedValue({});
    render(<OperationForm reportId="r1" />);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Done here');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Update saved.');
    expect(screen.getByLabelText(/notes/i)).toHaveValue('');
  });
});

describe('allowedOperationStatuses', () => {
  it('offers only Rescue in Progress right after assignment', () => {
    expect(allowedOperationStatuses('Team Assigned')).toEqual(['Rescue in Progress']);
  });

  it('offers Resolved once the rescue is in progress', () => {
    expect(allowedOperationStatuses('Rescue in Progress')).toEqual(['Rescue in Progress', 'Resolved']);
  });

  it('offers nothing for a resolved report', () => {
    expect(allowedOperationStatuses('Resolved')).toEqual([]);
  });
});
