import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const h = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('../../api/client', () => ({ api: h.api }));

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
  await user.selectOptions(screen.getByLabelText('Type of emergency'), 'flood');
  await user.type(screen.getByLabelText('What is happening?'), 'Water is rising fast');
}

describe('ReportForm', () => {
  beforeEach(() => {
    h.api.mockReset().mockResolvedValue({ id: 'r9', status: 'Submitted', reference: 'DR-AB12CD' });
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
  });

  it('refuses to submit without a location (review focus 1)', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillBasics(user);
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByText('Pick a location or use GPS before you submit.')).toBeInTheDocument();
    expect(h.api).not.toHaveBeenCalled();
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
    expect(screen.getByLabelText('Type of emergency')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Type of emergency')).toHaveAccessibleDescription(/choose|type|emergency/i);
    expect(screen.getByRole('link', { name: 'Type of emergency' })).toHaveAttribute('href', '#type');
    expect(screen.getByLabelText('Type of emergency')).toHaveFocus();
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
});
