import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import IncidentPreview from './IncidentPreview';
import { makeReport } from './fixtures';

vi.mock('./useReport', () => ({ useReportUpdates: () => ({ updates: [], error: null, retry: () => {} }) }));

it('keeps the caller and the reported severity accessible when those details are removed from queue rows', () => {
  render(<MemoryRouter><IncidentPreview report={makeReport({ severity: 'critical' })} reporter={{ name: 'Sample Resident', phone: '+15550100' }} canAct outsideFilters={false} onClearFilters={() => {}} /></MemoryRouter>);
  expect(screen.getByText('Sample Resident')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '+15550100' })).toHaveAttribute('href', 'tel:+15550100');
  expect(screen.getByText('Critical')).toBeInTheDocument();
});

it('explains missing caller data and shows medium severity by default without fabricating a contact', () => {
  render(<MemoryRouter><IncidentPreview report={makeReport({ severity: undefined })} canAct outsideFilters={false} onClearFilters={() => {}} /></MemoryRouter>);
  expect(screen.getByText('Name not recorded')).toBeInTheDocument();
  expect(screen.getByText('Severity').nextElementSibling).toHaveTextContent('Medium');
  expect(document.querySelector('a[href^="tel:"]')).toBeNull();
});
