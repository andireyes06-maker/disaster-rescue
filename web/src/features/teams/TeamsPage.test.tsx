import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', () => ({ api: h.api, ApiError: class extends Error {} }));
vi.mock('../../lib/position', () => ({ currentPosition: async () => ({ lat: 14.6, lng: 120.9 }) }));
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
it('offers Medical as a team identity when creating a team', async () => {
  h.api.mockReset().mockImplementation(async () => []);
  render(<TeamsPage />);
  await userEvent.click(await screen.findByRole('button', { name: 'Create team' }));
  const select = await screen.findByLabelText('Team identity');
  expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['PNP', 'BFP', 'Rescue', 'Medical', 'MDDRMO', 'Other']);
});

it('requires an HQ before creating and submits the selected location', async () => {
  h.api.mockReset().mockImplementation(async () => []);
  const user = userEvent.setup();
  render(<TeamsPage />);
  await user.click(await screen.findByRole('button', { name: 'Create team' }));
  const dialog = screen.getByRole('dialog', { name: 'Create a rescue team' });
  await user.type(within(dialog).getByLabelText('New team name'), 'Rescue North');
  await user.click(within(dialog).getByRole('button', { name: 'Create team' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Select a headquarters location');
  expect(h.api.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
  await user.click(within(dialog).getByRole('button', { name: 'Use my current location as headquarters' }));
  await user.click(within(dialog).getByRole('button', { name: 'Create team' }));
  await waitFor(() => expect(h.api).toHaveBeenCalledWith('/teams', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ hq: { lat: 14.6, lng: 120.9 } }) })));
});

it('lets a keyboard user select the map center without geolocation', async () => {
  h.api.mockReset().mockImplementation(async () => []);
  const user = userEvent.setup();
  render(<TeamsPage />);
  await user.click(await screen.findByRole('button', { name: 'Create team' }));
  const dialog = screen.getByRole('dialog', { name: 'Create a rescue team' });
  await user.type(within(dialog).getByLabelText('New team name'), 'Keyboard rescue');
  const map = dialog.querySelector<HTMLElement>('.leaflet-container')!;
  map.focus();
  await user.keyboard('{Enter}');
  expect(dialog.querySelector('.hq-pin')).toBeInTheDocument();
  await user.click(within(dialog).getByRole('button', { name: 'Create team' }));
  await waitFor(() => expect(h.api).toHaveBeenCalledWith('/teams', expect.objectContaining({ method: 'POST', body: expect.objectContaining({ hq: { lat: expect.closeTo(14.5995, 2), lng: expect.closeTo(120.9842, 2) } }) })));
});
