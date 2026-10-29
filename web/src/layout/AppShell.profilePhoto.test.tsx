import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const auth = vi.hoisted(() => ({ uid: 'd-1' }));
vi.mock('../auth/AuthProvider', () => ({
  useAuth: () => ({ user: { uid: auth.uid, email: 'd@test.dev', displayName: 'Dana Reyes' }, role: 'admin', logout: vi.fn() }),
}));
vi.mock('../features/demo/useDemoIndicator', () => ({ useDemoIndicator: () => null }));
vi.mock('../features/resident/useMyNotifications', () => ({
  useMyNotifications: () => ({ notifications: [], loading: false, error: null }),
}));
const client = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../api/client', () => ({ api: client.api }));

import AppShell from './AppShell';

const OLD = 'https://res.cloudinary.com/demo/old.jpg';
const NEW = 'https://res.cloudinary.com/demo/new.jpg';
const FAILED = 'Could not save your photo. Your current photo is unchanged.';

function me(photoUrl: string | null) {
  return { uid: 'd-1', name: 'Dana Reyes', email: 'd@test.dev', phone: null, role: 'admin', active: true, photoUrl };
}

async function openProfile() {
  render(<MemoryRouter><AppShell title="Dashboard"><p>body</p></AppShell></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Open profile for Dana Reyes' }));
  return screen.getByRole('dialog', { name: 'Your profile' });
}

const identityImg = (dialog: HTMLElement) => dialog.querySelector('.profile-identity img');

describe('AppShell profile photo', () => {
  beforeEach(() => { client.api.mockReset(); auth.uid = 'd-1'; });

  it('choosing a file uploads it and shows the new photo', async () => {
    client.api.mockImplementation(async (path: string, opts?: { method?: string; formData?: FormData }) => {
      if (path === '/users/me') return me(null);
      if (path === '/users/me/photo' && opts?.method === 'PUT') return { photoUrl: NEW };
      throw new Error(`unexpected ${path}`);
    });
    const dialog = await openProfile();
    expect(within(dialog).getByText('DR')).toBeInTheDocument();
    const status = within(dialog).getByRole('status');
    const file = new File(['png'], 'me.png', { type: 'image/png' });
    await userEvent.upload(within(dialog).getByLabelText('Choose a profile photo'), file);
    await waitFor(() => expect(identityImg(dialog)).toHaveAttribute('src', NEW));
    const put = client.api.mock.calls.find(([path]) => path === '/users/me/photo');
    expect(put?.[1].method).toBe('PUT');
    expect((put?.[1].formData as FormData).get('photo')).toBe(file);
    expect(status).toHaveTextContent('Your photo is saved.');
    // The open dialog hides the page behind it from the accessibility tree, so find the trigger by its class.
    expect(document.querySelector('.profile-trigger img')).toHaveAttribute('src', NEW);
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Change photo' })).toHaveFocus());
  });

  it('shows progress and disables the controls while the upload runs', async () => {
    let finish: (value: unknown) => void = () => {};
    client.api.mockImplementation((path: string) => {
      if (path === '/users/me') return Promise.resolve(me(OLD));
      return new Promise((resolve) => { finish = resolve; });
    });
    const dialog = await openProfile();
    await waitFor(() => expect(identityImg(dialog)).toHaveAttribute('src', OLD));
    await userEvent.upload(within(dialog).getByLabelText('Choose a profile photo'), new File(['png'], 'me.png', { type: 'image/png' }));
    expect(within(dialog).getByRole('status')).toHaveTextContent('Saving your photo...');
    expect(within(dialog).getByRole('button', { name: 'Change photo' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Remove photo' })).toBeDisabled();
    finish({ photoUrl: NEW });
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Change photo' })).toBeEnabled());
  });

  it(`a failed upload keeps the old photo and shows "${FAILED}"`, async () => {
    client.api.mockImplementation(async (path: string) => {
      if (path === '/users/me') return me(OLD);
      throw Object.assign(new Error('Photo must be JPEG, PNG or WebP'), { status: 400, code: 'invalid_photo' });
    });
    const dialog = await openProfile();
    await waitFor(() => expect(identityImg(dialog)).toHaveAttribute('src', OLD));
    await userEvent.upload(within(dialog).getByLabelText('Choose a profile photo'), new File(['png'], 'me.png', { type: 'image/png' }));
    await waitFor(() => expect(within(dialog).getByRole('status')).toHaveTextContent(FAILED));
    expect(identityImg(dialog)).toHaveAttribute('src', OLD);
    expect(within(dialog).getByRole('button', { name: 'Change photo' })).toBeEnabled();
  });

  it('a file over 5 MB is refused before any request', async () => {
    client.api.mockImplementation(async (path: string) => {
      if (path === '/users/me') return me(OLD);
      throw new Error('should not be called');
    });
    const dialog = await openProfile();
    await waitFor(() => expect(identityImg(dialog)).toHaveAttribute('src', OLD));
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' });
    await userEvent.upload(within(dialog).getByLabelText('Choose a profile photo'), big);
    expect(within(dialog).getByRole('status')).toHaveTextContent('This photo is larger than 5 MB. Choose a smaller photo.');
    expect(client.api.mock.calls.map(([path]) => path)).toEqual(['/users/me']);
    expect(identityImg(dialog)).toHaveAttribute('src', OLD);
  });

  it('Remove photo returns to initials', async () => {
    client.api.mockImplementation(async (path: string, opts?: { method?: string }) => {
      if (path === '/users/me') return me(OLD);
      if (path === '/users/me/photo' && opts?.method === 'DELETE') return { photoUrl: null };
      throw new Error(`unexpected ${path}`);
    });
    const dialog = await openProfile();
    await waitFor(() => expect(identityImg(dialog)).toHaveAttribute('src', OLD));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove photo' }));
    await waitFor(() => expect(identityImg(dialog)).toBeNull());
    expect(within(dialog).getByText('DR')).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Remove photo' })).toBeNull();
    expect(within(dialog).getByRole('status')).toHaveTextContent('Your photo is removed.');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Change photo' })).toHaveFocus());
  });

  it('offers no Remove photo button when there is no photo', async () => {
    client.api.mockResolvedValue(me(null));
    const dialog = await openProfile();
    await waitFor(() => expect(client.api).toHaveBeenCalledWith('/users/me'));
    expect(within(dialog).getByRole('button', { name: 'Change photo' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Remove photo' })).toBeNull();
  });
  it('clears the previous account photo while the next account loads or fails', async () => {
    client.api.mockResolvedValueOnce(me(OLD));
    const view = render(<MemoryRouter><AppShell title="Dashboard" /></MemoryRouter>);
    await waitFor(() => expect(document.querySelector('.profile-trigger img')).toHaveAttribute('src', OLD));
    let fail!: (reason: Error) => void;
    client.api.mockImplementation(() => new Promise((_, reject) => { fail = reject; }));
    auth.uid = 'other-account';
    view.rerender(<MemoryRouter><AppShell title="Dashboard" /></MemoryRouter>);
    expect(document.querySelector('.profile-trigger img')).toBeNull();
    await act(async () => { fail(new Error('offline')); });
    expect(document.querySelector('.profile-trigger img')).toBeNull();
  });

});
