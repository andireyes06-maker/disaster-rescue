import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import PasswordInput from './PasswordInput';
it('reveals and conceals the same password without submitting or losing its value', async () => {
  const submit = vi.fn(event => event.preventDefault());
  render(<form onSubmit={submit}><label htmlFor="password">Password</label><PasswordInput id="password" defaultValue="example-password" /></form>);
  const input = screen.getByLabelText('Password', { exact: true });
  // The name stays "Show password"; aria-pressed carries the state, so it is not read as "Hide password, pressed".
  const toggle = screen.getByRole('button', { name: 'Show password' });
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(toggle);
  expect(input).toHaveAttribute('type', 'text');
  expect(input).toHaveValue('example-password');
  expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(toggle);
  expect(input).toHaveAttribute('type', 'password');
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(submit).not.toHaveBeenCalled();
});

