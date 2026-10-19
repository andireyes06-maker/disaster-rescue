import type { ReportStatus } from '../../types/domain';
import { Clock3, Check, Circle, Flag, Activity, X, Copy, Ban } from 'lucide-react';

const ICONS = {
  Submitted: Circle,
  'Under Verification': Clock3,
  Verified: Check,
  'Awaiting Assignment': Clock3,
  'Team Assigned': Flag,
  'Rescue in Progress': Activity,
  Resolved: Check,
  Closed: Check,
  Rejected: X,
  Duplicate: Copy,
  Cancelled: Ban,
};

interface StatusBadgeProps {
  status: ReportStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const Icon = ICONS[status] || Circle;
  const complete = status === 'Resolved' || status === 'Closed';
  return (
    <span className={`badge badge--status${complete ? ' badge--complete' : ''}`}>
      <Icon aria-hidden="true" />
      <span key={status} data-motion="status">{status}</span>
    </span>
  );
}
