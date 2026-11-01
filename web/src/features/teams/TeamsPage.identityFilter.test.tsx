import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', () => ({ api: h.api, ApiError: class extends Error {} }));
import TeamsPage from './TeamsPage';

it('filters teams by identity such as PNP, and shows members with their photo', async () => {
  h.api.mockImplementation(async (path: string) => {
    if (path === '/teams') return [
      { id: 't1', name: 'Bulacan PNP', kind: 'PNP', busy: false },
      { id: 't2', name: 'Fire Station 1', kind: 'BFP', busy: false },
    ];
    if (path === '/users') return [{ uid: 'u1', name: 'Ana Cruz', role: 'responder', active: true, team: 't1', photo: { url: 'https://img.test/ana.jpg' } }];
    return [];
  });
  const user = userEvent.setup();
  const { container } = render(<TeamsPage />);
  await screen.findByText('Bulacan PNP');
  expect(container.querySelector('.team-members img[src="https://img.test/ana.jpg"]')).not.toBeNull();
  await user.selectOptions(screen.getByLabelText('Filter by identity'), 'PNP');
  expect(screen.getByText('Bulacan PNP')).toBeInTheDocument();
  expect(screen.queryByText('Fire Station 1')).not.toBeInTheDocument();
  expect(screen.getByRole('status', { name: '' })).toHaveTextContent('Showing 1 of 2 teams');
});
