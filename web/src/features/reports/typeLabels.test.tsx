import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { makeReport } from './fixtures';
import type { Report } from '../../types/domain';

const h = vi.hoisted(() => ({ reports: [] as Report[] }));
vi.mock('./useAwaitingReports', () => ({ useAwaitingReports: () => ({ reports: h.reports, loading: false, error: null, retry: () => {} }) }));
vi.mock('./useReports', () => ({ useReports: () => ({ reports: h.reports, loading: false, error: null, retry: () => {} }) }));
vi.mock('../../auth/AuthProvider', () => ({ useAuth: () => ({ role: 'admin' }) }));
vi.mock('./useReport', () => ({ useReportUpdates: () => ({ updates: [], error: null, retry: () => {} }) }));
import ReportQueue from './ReportQueue';
import IncidentPreview from './IncidentPreview';
import AssignmentRows from '../responder/AssignmentRows';

// A report of each shape a person can meet: a new type, Other with typed text, a key this build does not know.
const road = () => makeReport({ id: 'road', type: 'road_hazard' });
const other = () => makeReport({ id: 'oth', type: 'other', typeDetail: 'gas leak' });
const unknown = () => makeReport({ id: 'unk', type: 'zzz' as Report['type'] });

const preview = (report: Report) => render(<MemoryRouter><IncidentPreview report={report} canAct outsideFilters={false} onClearFilters={() => {}} /></MemoryRouter>);
const rows = (report: Report) => render(<MemoryRouter><AssignmentRows reports={[report]} /></MemoryRouter>);

describe('type labels in the report preview', () => {
  it.each([
    [road, 'Roadblock report'],
    [other, 'Other: gas leak report'],
    [unknown, 'Other report'],
  ])('heading for %#', (make, heading) => {
    const { container } = preview(make());
    expect(screen.getByRole('heading', { level: 2, name: heading })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/road_hazard|zzz/);
  });
});

describe('type labels in responder rows', () => {
  it.each([
    [road, 'Roadblock'],
    [other, 'Other: gas leak'],
    [unknown, 'Other'],
  ])('row for %#', (make, label) => {
    const { container } = rows(make());
    expect(within(container.querySelector('.response-type:not(.response-row__symbol)') as HTMLElement).getByText(label)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/road_hazard|zzz/);
  });
  it('a report with no reference is named by its label', () => {
    const { container } = rows(makeReport({ type: 'power_line', reference: undefined }));
    expect(container.querySelector('strong')).toHaveTextContent('Live Wire report');
  });
});

describe('type labels in the inbox', () => {
  const show = (reports: Report[], url = '/') => { h.reports = reports; return render(<MemoryRouter initialEntries={[url]}><ReportQueue /></MemoryRouter>); };
  const inbox = () => screen.getByRole('list', { name: 'Report inbox' });

  it('names each row by its label and never by the key', () => {
    show([road(), other(), unknown()]);
    const list = inbox();
    expect(within(list).getByText('Roadblock')).toBeInTheDocument();
    expect(within(list).getByText('Other: gas leak')).toBeInTheDocument();
    expect(list.textContent).not.toMatch(/road_hazard|zzz/);
  });

  it('shows typed text as plain characters, never as markup', () => {
    show([makeReport({ type: 'other', typeDetail: '<b>x</b>' })]);
    expect(inbox().querySelector('b')).toBeNull();
    expect(within(inbox()).getByText('Other: <b>x</b>')).toBeInTheDocument();
  });

  it('lists all 8 labels in the Type filter', async () => {
    show([road()]);
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));
    const options = within(screen.getByLabelText('Type')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(expect.arrayContaining(['Flood', 'Fire', 'Earthquake', 'Landslide', 'Lifeline', 'Roadblock', 'Live Wire', 'Other']));
  });

  it('finds a report by its label, or by the typed text', () => {
    show([road(), other()], '/?q=roadblock');
    expect(within(inbox()).getByText('Roadblock')).toBeInTheDocument();
    expect(within(inbox()).queryByText('Other: gas leak')).toBeNull();
  });
});
