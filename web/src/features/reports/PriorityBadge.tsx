import type { Priority } from '../../types/domain';

const ICONS: Partial<Record<Priority, string>> = { critical: '⚠', high: '▲', medium: '◆', low: '▼' };

interface PriorityBadgeProps {
  priority: Priority;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const p: Priority = ICONS[priority] ? priority : 'low';
  return (
    <span className={`badge badge--${p}`}>
      <span aria-hidden="true">{ICONS[p]}</span>
      <span>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
    </span>
  );
}
