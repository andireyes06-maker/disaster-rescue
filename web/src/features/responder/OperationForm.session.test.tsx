import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  api: vi.fn(),
  position: vi.fn(),
  auth: { currentUser: { getIdToken: async () => 'first-session' } as { getIdToken: () => Promise<string> } | null },
}));
vi.mock('../../firebase-auth', () => ({ getFirebaseAuth: () => h.auth }));
vi.mock('../../lib/position', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/position')>()), currentPosition: () => h.position() }));
vi.mock('../../api/client', async () => {
  class ApiError extends Error {}
  return { api: h.api, ApiError };
});
import OperationForm from './OperationForm';
import { resetDraftStoreForTests } from './draftStore';

describe('OperationForm after a same-account sign-in', () => {
  beforeEach(() => {
    h.api.mockReset(); h.api.mockResolvedValue({});
    h.position.mockReset();
    h.auth.currentUser = { getIdToken: async () => 'first-session' };
    resetDraftStoreForTests();
  });

  it('gives the form back when the session changes during a GPS fix, without posting', async () => {
    let resolve!: (p: { lat: number; lng: number }) => void;
    h.position.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    render(<OperationForm reportId="r-session" reportStatus="Rescue in Progress" />);
    await userEvent.type(screen.getByLabelText(/notes/i), 'Still at the site');
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    expect(screen.getByText(/posting update/i)).toBeInTheDocument();
    // The same account signs in again: a new Auth user object, the same draft.
    h.auth.currentUser = { getIdToken: async () => 'second-session' };
    await act(async () => resolve({ lat: 14.8, lng: 120.8 }));
    expect(h.api).not.toHaveBeenCalled();
    expect(screen.queryByText(/posting update/i)).not.toBeInTheDocument();
    // The responder can send the update again under the new session.
    h.position.mockResolvedValueOnce({ lat: 14.8, lng: 120.8 });
    await userEvent.click(screen.getByRole('button', { name: 'Submit update' }));
    await screen.findByText('Update saved.');
    expect(h.api).toHaveBeenCalledTimes(1);
  });
});
