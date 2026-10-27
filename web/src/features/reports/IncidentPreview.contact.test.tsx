import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import IncidentPreview from './IncidentPreview';
import { makeReport } from './fixtures';

vi.mock('./useReport', () => ({ useReportUpdates: () => ({ updates: [], error: null, retry: () => {} }) }));

it('keeps the caller and reported reach accessible when those details are removed from queue rows', () => {
  render(<MemoryRouter><IncidentPreview report={makeReport({ affectedRadiusM: 1500 })} reporter={{ name: 'Sample Resident', phone: '+15550100' }} canAct outsideFilters={false} onClearFilters={() => {}} /></MemoryRouter>);
  expect(screen.getByText('Sample Resident')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '+15550100' })).toHaveAttribute('href', 'tel:+15550100');
  expect(screen.getByText('1.5 km from the location')).toBeInTheDocument();
});

it('explains missing caller data and the default reach without fabricating a contact', () => {
  render(<MemoryRouter><IncidentPreview report={makeReport({ affectedRadiusM: undefined })} canAct outsideFilters={false} onClearFilters={() => {}} /></MemoryRouter>);
  expect(screen.getByText('Name not recorded')).toBeInTheDocument();
  expect(screen.getByText('500 m (default) from the location')).toBeInTheDocument();
  expect(document.querySelector('a[href^="tel:"]')).toBeNull();
});
