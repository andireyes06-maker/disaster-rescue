import type { Priority } from '../../types/domain';
import { TriangleAlert, ChevronUp, Minus, ChevronDown } from 'lucide-react';

const ICONS = { critical: TriangleAlert, high: ChevronUp, medium: Minus, low: ChevronDown };

interface PriorityBadgeProps {
  priority: Priority;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const p: Priority = ICONS[priority] ? priority : 'low';
  const Icon = ICONS[p];
  return (
    <span className={`badge badge--${p}`}>
      <Icon aria-hidden="true" />
      <span>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
    </span>
  );
}
