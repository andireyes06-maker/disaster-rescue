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

describe('OperationForm', () => {
  beforeEach(() => { h.api.mockReset(); h.api.mockResolvedValue({}); });

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
