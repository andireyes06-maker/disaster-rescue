import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { makeReport } from './fixtures.js';

const h = vi.hoisted(() => ({ reports: [] }));
vi.mock('./useReports.js', () => ({ useReports: () => ({ reports: h.reports, loading: false, error: null }) }));
import ReportQueue from './ReportQueue.jsx';

function show(reports) {
  h.reports = reports;
  return render(<MemoryRouter><ReportQueue /></MemoryRouter>);
}
const data = () => [
  makeReport({ id: 'a', description: 'Flood A', type: 'flood', priority: 'critical', verified: true, status: 'Verified' }),
  makeReport({ id: 'b', description: 'Fire B', type: 'fire', priority: 'low', verified: false, status: 'Submitted' }),
];

describe('ReportQueue', () => {
  it('shows the empty state', () => {
    show([]);
    expect(screen.getByText(/no reports match/i)).toBeInTheDocument();
  });

  it('rows link to incident details', () => {
    show(data());
    expect(screen.getByRole('link', { name: /Flood A/ })).toHaveAttribute('href', '/incidents/a');
  });

  it('computes summary cards', () => {
    show(data());
    const card = (name) => document.querySelector('.summary').textContent.match(new RegExp(`${name}(\\d+)`))[1];
    expect(card('Total')).toBe('2');
    expect(card('Open')).toBe('2');
    expect(card('Critical')).toBe('1');
    expect(card('Verified')).toBe('1');
  });

  it.each([
    ['Status', 'Submitted'],
    ['Type', 'fire'],
    ['Priority', 'low'],
    ['Verification', 'pending'],
  ])('filter %s narrows rows', async (label, value) => {
    show(data());
    await userEvent.selectOptions(screen.getByLabelText(label), value);
    expect(screen.queryByText('Flood A')).toBeNull();
    expect(screen.getByText('Fire B')).toBeInTheDocument();
  });
});
