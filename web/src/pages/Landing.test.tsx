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
  it('shows the safety text exactly', () => {
    renderLanding();
    expect(screen.getByText(
      'Submitting a report through this app does not automatically guarantee immediate rescue. If you are in danger, call your local emergency hotline.',
    )).toBeInTheDocument();
  });

  it('restores the landing title and puts safety guidance before the film', () => {
    document.title = 'Sign in · Rescue Reports';
    renderLanding();
    expect(document.title).toBe('Rescue Reports · Report clearly. Respond together.');
    const safety = document.querySelector('.service-safety')!;
    const film = document.querySelector('.response-film')!;
    expect(safety.compareDocumentPosition(film) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows service guidance without inventing a dialable hotline', () => {
    renderLanding();
    expect(screen.getByText('Report incidents. Follow response updates.')).toBeInTheDocument();
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
  });

  it('sends the administrator entries to /login', () => {
    renderLanding();
    const links = screen.getAllByRole('link', { name: 'Administrator sign in' });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/login');
    }
    expect(screen.queryByRole('link', { name: 'Staff sign in' })).toBeNull();
  });

  it('sends residents to the mobile app, not to website sign-in or registration', () => {
    renderLanding();
    expect(screen.queryByRole('link', { name: 'Already a resident? Sign in' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Create a resident account' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'New here? Create an account' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Get the mobile app' })).toHaveAttribute('href', '#residents');
  });

  it('says residents and rescuers use the mobile app, and the website is for administrators', () => {
    renderLanding();
    expect(screen.getByText('Use the Rescue Reports mobile app to submit reports, add a location and check updates. The website is for administrators.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /app store|google play/i })).toBeNull();
  });

  it('describes the report-to-response sequence', () => {
    renderLanding();
    expect(screen.getByText('From first report to field update')).toBeInTheDocument();
  });

  it('provides practical privacy guidance', () => {
    renderLanding();
    expect(screen.getByText('Share only the details needed to explain the incident. Avoid sensitive personal information in photos and descriptions.')).toBeInTheDocument();
  });
});
