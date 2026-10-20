// Browser-side retry behavior (IDEMPOTENCY-REPAIR-SPEC.md): same-tab reload, edit-away-and-back, account switch,
// unavailable storage, and clearing after a confirmed send. Transport failures are injected through the mocked API client.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const h = vi.hoisted(() => ({ api: vi.fn(), uid: 'uid-1' as string | null }));
vi.mock('../../api/client', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../api/client')>(), api: h.api,
}));
vi.mock('../../auth/AuthProvider', () => ({ useOptionalUid: () => h.uid }));

import ReportForm from './ReportForm';
import { storageKeyFor } from './submissionAttempts';

const LOST = { status: 0 };
const SCOPE = (uid: string) => ({ uid, project: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '', apiBase: import.meta.env.VITE_API_BASE_URL ?? '' });
const photoFile = (text: string) => new File([text], 'scene.jpg', { type: 'image/jpeg', lastModified: 100 });

function giveGps() {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 14.6, longitude: 121.0 } }) },
  });
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/my/report']}>
      <Routes>
        <Route path="/my/report" element={<ReportForm />} />
        <Route path="/my/reports/:id" element={<p>report detail</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fill(user: ReturnType<typeof userEvent.setup>, description: string) {
  await user.click(screen.getByRole('radio', { name: 'Flood' }));
  const box = screen.getByLabelText('What is happening?');
  await user.clear(box);
  await user.type(box, description);
  await user.click(screen.getByRole('button', { name: 'Use my location' }));
}

async function submit(user: ReturnType<typeof userEvent.setup>, expectedCalls: number) {
  await user.click(screen.getByRole('button', { name: 'Submit report' }));
  await waitFor(() => expect(h.api).toHaveBeenCalledTimes(expectedCalls));
  return h.api.mock.calls[expectedCalls - 1][1].headers['Idempotency-Key'] as string;
}

async function attachPhoto(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = screen.getByLabelText('Photos (up to 5)');
  await user.upload(input, photoFile(text));
}

describe('report retry keys in this tab', () => {
  beforeEach(() => {
    h.api.mockReset();
    h.uid = 'uid-1';
    sessionStorage.clear();
    giveGps();
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('a same-tab reload, then re-entering the same report and photo, reuses the original retry key', async () => {
    h.api.mockRejectedValue(LOST);
    const user = userEvent.setup();
    const first = renderForm();
    await fill(user, 'Water is rising fast');
    await attachPhoto(user, 'scene-bytes');
    const key = await submit(user, 1);
    first.unmount();
    // A reload starts a fresh page: nothing is restored, and the entries are typed again.
    renderForm();
    await fill(user, 'Water is rising fast');
    await attachPhoto(user, 'scene-bytes');
    h.api.mockResolvedValue({ id: 'r9', status: 'Submitted', reference: 'DR-AB12CD' });
    expect(await submit(user, 2)).toBe(key);
    expect(await screen.findByText('report detail')).toBeInTheDocument();
  });

  it('editing away and back to an unconfirmed version reuses that version\'s key', async () => {
    h.api.mockRejectedValue(LOST);
    const user = userEvent.setup();
    renderForm();
    await fill(user, 'Version A of the report');
    const keyA = await submit(user, 1);
    await user.clear(screen.getByLabelText('What is happening?'));
    await user.type(screen.getByLabelText('What is happening?'), 'Version B of the report');
    const keyB = await submit(user, 2);
    expect(keyB).not.toBe(keyA);
    await user.clear(screen.getByLabelText('What is happening?'));
    await user.type(screen.getByLabelText('What is happening?'), 'Version A of the report');
    expect(await submit(user, 3)).toBe(keyA);
  });

  it('a different account in the same tab never reuses another account\'s retry key', async () => {
    h.api.mockRejectedValue(LOST);
    const user = userEvent.setup();
    const first = renderForm();
    await fill(user, 'Shared text');
    const keyForA = await submit(user, 1);
    first.unmount();
    h.uid = 'uid-2';
    renderForm();
    await fill(user, 'Shared text');
    expect(await submit(user, 2)).not.toBe(keyForA);
  });

  it('a successful send clears its entry, so the same content later is a new intent with a new key', async () => {
    const user = userEvent.setup();
    h.api.mockResolvedValueOnce({ id: 'r1', status: 'Submitted', reference: 'DR-AAAAAA' });
    const first = renderForm();
    await fill(user, 'Clear after success');
    const done = await submit(user, 1);
    expect(await screen.findByText('report detail')).toBeInTheDocument();
    first.unmount();
    h.api.mockRejectedValue(LOST);
    renderForm();
    await fill(user, 'Clear after success');
    expect(await submit(user, 2)).not.toBe(done);
  });

  it('when storage is denied, retries still reuse the key within the page and the form keeps working', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('[injected] storage full'); });
    h.api.mockRejectedValue(LOST);
    const user = userEvent.setup();
    renderForm();
    await fill(user, 'Storage is unavailable');
    const key = await submit(user, 1);
    expect(await submit(user, 2)).toBe(key);
    expect(screen.getByLabelText('What is happening?')).toHaveValue('Storage is unavailable');
  });

  it('keeps only digests and keys in storage for the attempt', async () => {
    h.api.mockRejectedValue(LOST);
    const user = userEvent.setup();
    renderForm();
    await fill(user, 'Secret description text');
    await attachPhoto(user, 'raw-photo-bytes');
    await submit(user, 1);
    const stored = sessionStorage.getItem(storageKeyFor(SCOPE('uid-1'))) ?? '';
    expect(stored).not.toBe('');
    expect(stored).not.toContain('Secret description');
    expect(stored).not.toContain('raw-photo-bytes');
    expect(stored).not.toContain('14.6');
  });

  it('a second activation while the first is in flight sends one request', async () => {
    let finish: (v: unknown) => void = () => {};
    h.api.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    renderForm();
    await fill(user, 'Double activation');
    const button = screen.getByRole('button', { name: 'Submit report' });
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(h.api).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 50));
    expect(h.api).toHaveBeenCalledTimes(1);
    finish({ id: 'r2', status: 'Submitted', reference: 'DR-BBBBBB' });
    expect(await screen.findByText('report detail')).toBeInTheDocument();
  });
});
