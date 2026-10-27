import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', () => ({ api: h.api, ApiError: class extends Error {} }));
vi.mock('../../lib/placeName', () => ({ approximatePlaceName: async () => 'Selected street, Harbor' }));
import TeamsPage from './TeamsPage';
it('keeps a failed headquarters save visible inside its dialog', async () => {
  h.api.mockImplementation(async (path: string, options?: { method: string }) => {
    if (options?.method === 'PATCH') throw Error('offline');
    return path === '/teams' ? [{ id: 't1', name: 'Harbor Alpha', busy: false, hq: { lat: 14.6, lng: 120.9 }, hqName: 'Stored headquarters' }] : [];
  });
  render(<TeamsPage />);
  await screen.findByText('Harbor Alpha');
  await userEvent.click(screen.getByRole('button', { name: 'Edit location' }));
  const dialog = screen.getByRole('dialog', { name: 'Set headquarters for Harbor Alpha' });
  expect(within(dialog).getByText('Stored headquarters')).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save location' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not save the location. Try again.');
  expect(dialog).toBeVisible();
  expect(h.api).toHaveBeenCalledWith('/teams/t1', { method: 'PATCH', body: { hq: { lat: 14.6, lng: 120.9 }, hqName: 'Selected street, Harbor' } });
});
