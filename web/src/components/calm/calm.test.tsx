import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';
import DataTable, { type Column } from './DataTable';
import Field from './Field';
import Banner from './Banner';
import EmptyState from './EmptyState';
import PageHeader from './PageHeader';

describe('Badge', () => {
  it.each(['status', 'critical', 'high', 'medium', 'low', 'neutral'] as const)(
    'renders its text for tone %s',
    (tone) => {
      render(<Badge tone={tone}>Assigned</Badge>);
      expect(screen.getByText('Assigned')).toHaveClass('badge', `badge--${tone}`);
    },
  );
});

describe('DataTable', () => {
  type Row = { type: string; team: string };
  const columns: Column<Row>[] = [
    { key: 'type', header: 'Type', render: (r) => r.type },
    { key: 'team', header: 'Team', render: (r) => r.team },
  ];

  it('shows the empty content when there are no rows', () => {
    render(
      <DataTable columns={columns} rows={[]} rowKey={(r) => r.type} empty={<p>Nothing here yet.</p>} />,
    );
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('labels each cell with its column header for the stacked layout', () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ type: 'Flood', team: 'Team A' }]}
        rowKey={(r) => r.type}
        empty={null}
      />,
    );
    expect(screen.getByText('Team A')).toHaveAttribute('data-label', 'Team');
  });
});

describe('Field', () => {
  it('associates the visible label with its input', () => {
    render(
      <Field label="Email" id="email">
        <input id="email" />
      </Field>,
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('shows the error message when given', () => {
    render(
      <Field label="Name" id="name" error="Enter a name.">
        <input id="name" />
      </Field>,
    );
    expect(screen.getByText('Enter a name.')).toHaveClass('calm-field__error');
  });
});

describe('Banner', () => {
  it('uses role alert for error banners when asked', () => {
    render(<Banner tone="error" role="alert">Could not save.</Banner>);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save.');
  });
});

describe('EmptyState', () => {
  it('renders title, body, and the next step', () => {
    render(<EmptyState title="No reports" body="New reports appear here." action={<a href="/map">Open map</a>} />);
    expect(screen.getByRole('heading', { name: 'No reports' })).toBeInTheDocument();
    expect(screen.getByText('New reports appear here.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open map' })).toBeInTheDocument();
  });
});

describe('PageHeader', () => {
  it('renders the page title as a level 1 heading', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });
});
