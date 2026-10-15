import type { ReportStatus } from '../../types/domain';

const ICONS: Partial<Record<ReportStatus, string>> = {
  Submitted: '✉',
  'Under Verification': '⧖',
  Verified: '✓',
  'Awaiting Assignment': '⏳',
  'Team Assigned': '⚑',
  'Rescue in Progress': '⚒',
  Resolved: '✔',
  Closed: '■',
  Rejected: '✕',
  Duplicate: '⧉',
  Cancelled: '⊘',
};

interface StatusBadgeProps {
  status: ReportStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className="badge badge--status">
      <span aria-hidden="true">{ICONS[status] || '●'}</span>
      <span>{status}</span>
    </span>
  );
}
