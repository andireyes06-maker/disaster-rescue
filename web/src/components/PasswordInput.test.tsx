import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import PasswordInput from './PasswordInput';
it('reveals and conceals the same password without submitting or losing its value', async () => {
  const submit = vi.fn(event => event.preventDefault());
  render(<form onSubmit={submit}><label htmlFor="password">Password</label><PasswordInput id="password" defaultValue="example-password" /></form>);
  const input = screen.getByLabelText('Password', { exact: true });
  await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
  expect(input).toHaveAttribute('type', 'text');
  expect(input).toHaveValue('example-password');
  await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
  expect(input).toHaveAttribute('type', 'password');
  expect(submit).not.toHaveBeenCalled();
});

