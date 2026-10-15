const ICONS = {
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

export default function StatusBadge({ status }) {
  return (
    <span className="badge badge--status">
      <span aria-hidden="true">{ICONS[status] || '●'}</span>
      <span>{status}</span>
    </span>
  );
}
