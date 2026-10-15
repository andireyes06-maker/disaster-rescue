import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import type { ReportStatus } from '../../types/domain';

const STATUSES: ReportStatus[] = ['Submitted', 'Under Verification', 'Verified', 'Awaiting Assignment', 'Team Assigned',
  'Rescue in Progress', 'Resolved', 'Closed', 'Rejected', 'Duplicate', 'Cancelled'];

describe('StatusBadge', () => {
  it.each(STATUSES)('shows the text for %s', (s) => {
    render(<StatusBadge status={s} />);
    expect(screen.getByText(s)).toBeInTheDocument();
  });
});

describe('PriorityBadge', () => {
  it.each(['low', 'medium', 'high', 'critical'] as const)('shows the text for %s', (p) => {
    render(<PriorityBadge priority={p} />);
    expect(screen.getByText(new RegExp(p, 'i'))).toBeInTheDocument();
  });
});
