import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', () => ({ api: h.api }));
import PasswordHelpPanel from './PasswordHelpPanel';

it('asks in a modal before resetting, and sends nothing until confirmed', async () => {
  h.api.mockImplementation(async (path: string, options?: { method: string }) => (options?.method === 'POST' ? {} : [{ id: 'h1', email: 'ana@x.test' }]));
  const user = userEvent.setup();
  render(<PasswordHelpPanel />);
  await user.click(await screen.findByRole('button', { name: 'Reset password' }));
  const dialog = screen.getByRole('dialog', { name: 'Reset this password?' });
  expect(dialog).toHaveTextContent('Are you sure?');
  expect(h.api).not.toHaveBeenCalledWith(expect.stringContaining('reset-password'), expect.anything());
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(h.api).not.toHaveBeenCalledWith(expect.stringContaining('reset-password'), expect.anything());
  await user.click(screen.getByRole('button', { name: 'Reset password' }));
  await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, reset it' }));
  expect(h.api).toHaveBeenCalledWith('/auth/reset-help/h1/reset-password', { method: 'POST' });
});
