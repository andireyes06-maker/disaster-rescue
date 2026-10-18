import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../api/client')>(), api: h.api,
}));

import ReportForm from './ReportForm';

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

function giveGps() {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 14.6, longitude: 121.0 } }) },
  });
}

async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: 'Flood' }));
  await user.type(screen.getByLabelText('What is happening?'), 'Water is rising fast');
}

describe('ReportForm', () => {
  it('changes the retry key when a replacement photo has identical metadata', async () => {
    h.api.mockRejectedValue({ status: 500 });
    giveGps();
    const user = userEvent.setup();
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    const photo = screen.getByLabelText('Photos (up to 5)');
    await user.upload(photo, new File(['a'], 'incident.jpg', { type: 'image/jpeg', lastModified: 100 }));
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    const first = h.api.mock.calls[0][1].headers['Idempotency-Key'];
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(h.api.mock.calls[1][1].headers['Idempotency-Key']).toBe(first);
    await user.upload(photo, new File(['b'], 'incident.jpg', { type: 'image/jpeg', lastModified: 100 }));
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(h.api.mock.calls[2][1].headers['Idempotency-Key']).not.toBe(first);
  });

  beforeEach(() => {
    h.api.mockReset().mockResolvedValue({ id: 'r9', status: 'Submitted', reference: 'DR-AB12CD' });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
  });

  it.each([0, 500])('keeps the draft and treats a %s failure as an unconfirmed submission', async (status) => {
    h.api.mockRejectedValue({ status });
    giveGps();
    const user = userEvent.setup();
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByText(/Check My reports before sending again\./)).toBeInTheDocument();
    expect(screen.getByLabelText('What is happening?')).toHaveValue('Water is rising fast');
    expect(screen.queryByText(/report (was not|has not been) sent/i)).not.toBeInTheDocument();
    expect(h.api).toHaveBeenCalledTimes(1);
  });

  it('refuses to submit without a location (review focus 1)', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByText('Pick a location or use GPS before you submit.')).toBeInTheDocument();
    expect(h.api).not.toHaveBeenCalled();
  });

  it('requires both manual coordinates and sends the confirmed pair as a manual location', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByText('Enter coordinates instead'));
    await user.type(screen.getByLabelText('Latitude'), '14.6');
    expect(screen.getByRole('button', { name: 'Set coordinates' })).toBeDisabled();
    await user.type(screen.getByLabelText('Longitude'), '121');
    await user.click(screen.getByRole('button', { name: 'Set coordinates' }));
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    const form = h.api.mock.calls[0][1].formData as FormData;
    expect(form.get('source')).toBe('manual');
    expect(form.get('lat')).toBe('14.6');
    expect(form.get('lng')).toBe('121');
  });

  it('refuses more than 5 photos', async () => {
    const user = userEvent.setup();
    renderForm();
    const files = Array.from({ length: 6 }, (_, i) => new File(['x'], `p${i}.jpg`, { type: 'image/jpeg' }));
    await user.upload(screen.getByLabelText('Photos (up to 5)'), files);
    expect(await screen.findByText('At most 5 photos allowed.')).toBeInTheDocument();
  });

  it('refuses a photo over 5 MB', async () => {
    const user = userEvent.setup();
    renderForm();
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    await user.upload(screen.getByLabelText('Photos (up to 5)'), big);
    expect(await screen.findByText('Each photo must be 5 MB or smaller.')).toBeInTheDocument();
  });

  it('sends one request on a double click (review focus 2)', async () => {
    giveGps();
    let finish: (v: unknown) => void = () => {};
    h.api.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    const submit = screen.getByRole('button', { name: 'Submit report' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(h.api).toHaveBeenCalledTimes(1);
    finish({ id: 'r9', status: 'Submitted', reference: 'DR-AB12CD' });
    expect(await screen.findByText('report detail')).toBeInTheDocument();
  });

  it('posts multipart with the report fields and the photos', async () => {
    giveGps();
    const user = userEvent.setup();
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(h.api).toHaveBeenCalledWith('/reports', expect.objectContaining({ method: 'POST', formData: expect.any(FormData) }));
    const form = h.api.mock.calls[0][1].formData as FormData;
    expect(form.get('type')).toBe('flood');
    expect(form.get('source')).toBe('gps');
    expect(form.get('lat')).toBe('14.6');
  });

  it('an invalid submit marks fields, links the summary, and moves focus to the first invalid field (W09)', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(screen.getByRole('group', { name: 'Type of emergency' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('group', { name: 'Type of emergency' })).toHaveAccessibleDescription(/choose|type|emergency/i);
    expect(screen.getByRole('link', { name: 'Type of emergency' })).toHaveAttribute('href', '#type');
    expect(screen.getByRole('group', { name: 'Type of emergency' })).toHaveFocus();
    expect(h.api).not.toHaveBeenCalled();
  });

  it('a half-filled contact pair is flagged on both contact fields (W09)', async () => {
    const user = userEvent.setup();
    giveGps();
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    await user.type(screen.getByLabelText('Your name (optional)'), 'Ana');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(screen.getByLabelText('Your name (optional)')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Phone (optional)')).toHaveAttribute('aria-invalid', 'true');
    expect(h.api).not.toHaveBeenCalled();
  });

  it('warns before leaving the page when the report has unsaved entries (W10)', async () => {
    const user = userEvent.setup();
    renderForm();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    await user.type(screen.getByLabelText('What is happening?'), 'Water up to the roof');
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });

  it('sends the same Idempotency-Key on an unchanged retry', async () => {
    h.api.mockRejectedValueOnce({ status: 500 }).mockRejectedValueOnce({ status: 0 });
    giveGps();
    const user = userEvent.setup();
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    await screen.findByText(/Check My reports before sending again\./);
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    await screen.findByText(/Check My reports before sending again\./);
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    const keys = h.api.mock.calls.map((c) => c[1].headers['Idempotency-Key'] as string);
    expect(keys).toHaveLength(3);
    expect(keys[0]).toMatch(/^[A-Za-z0-9_-]{16,100}$/);
    expect(new Set(keys).size).toBe(1);
  });

  it('uses a new Idempotency-Key when the report changes after a failed attempt', async () => {
    h.api.mockRejectedValueOnce({ status: 500 });
    giveGps();
    const user = userEvent.setup();
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Use my location' }));
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    await screen.findByText(/Check My reports before sending again\./);
    await user.type(screen.getByLabelText('What is happening?'), ' Water has reached the second floor.');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    const [first, second] = h.api.mock.calls.map((c) => c[1].headers['Idempotency-Key'] as string);
    expect(second).not.toBe(first);
  });
});
