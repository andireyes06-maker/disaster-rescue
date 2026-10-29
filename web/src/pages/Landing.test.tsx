import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from './Landing';

const renderLanding = () => render(<MemoryRouter><Landing /></MemoryRouter>);
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Landing', () => {
  it('keeps store badge names consistent with their visible labels', () => {
    renderLanding();
    for (const link of screen.getAllByRole('link', { name: 'Download the Android app' })) {
      expect(link).toHaveAttribute('href', expect.stringContaining('android-online-2026-10-29-update20'));
    }
    for (const badge of screen.getAllByRole('button', { name: 'Coming soon on the App Store' })) expect(badge).toBeDisabled();
  });

  it('shows the safety text exactly', () => {
    renderLanding();
    expect(screen.getByText(
      'Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.',
    )).toBeInTheDocument();
  });

  it('restores the landing title and puts safety guidance before the film', () => {
    document.title = 'Sign in · I-Report';
    renderLanding();
    expect(document.title).toBe('I-Report · Report clearly. Respond together.');
    const safety = document.querySelector('.service-safety')!;
    const film = document.querySelector('.response-film')!;
    expect(safety.compareDocumentPosition(film) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows service guidance without inventing a dialable hotline', () => {
    renderLanding();
    expect(screen.getByText('Report incidents. Follow response updates.')).toBeInTheDocument();
    expect(screen.queryByText(/demo site|hotline not configured/i)).toBeNull();
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  });

  it('sends the administrator entries to /login', () => {
    renderLanding();
    for (const link of screen.getAllByRole('link', { name: 'Administrator sign in' })) {
      expect(link).toHaveAttribute('href', '/login');
    }
  });

  it('sends residents to the mobile app, not to website sign-in or registration', () => {
    renderLanding();
    const path = document.getElementById('residents');
    expect(path).not.toBeNull();
    expect(within(path!).getByText('Residents send reports and follow updates in the I-Report mobile app.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create a resident account' })).toBeNull();
  });

  it('explains that residents use the mobile app and staff use the website', () => {
    renderLanding();
    expect(screen.getByText('Use the I-Report mobile app to submit reports, add a location and check updates. The website is for administrators and rescue teams.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /app store|google play/i })).toBeNull();
  });

  it('describes the report-to-response sequence', () => {
    renderLanding();
    expect(screen.getByText('Illustrated workflow · Not live data')).toBeInTheDocument();
  });

  it('provides practical privacy guidance', () => {
    renderLanding();
    expect(screen.getByText('Share only the details needed to explain the incident. Avoid sensitive personal information in photos and descriptions.')).toBeInTheDocument();
  });
});
