import type { Priority, Report } from '../../types/domain';

export type MarkerShape = 'triangle' | 'diamond' | 'square' | 'circle';

export interface MarkerStyle {
  color: string;
  shape: MarkerShape;
  label: string;
}

// Priority is carried by color, shape, and text together. Coral (critical) is reserved for critical.
const STYLES: Record<Priority, MarkerStyle> = {
  critical: { color: 'var(--color-critical)', shape: 'triangle', label: 'Critical' },
  high: { color: 'var(--color-high)', shape: 'diamond', label: 'High' },
  medium: { color: 'var(--color-medium)', shape: 'square', label: 'Medium' },
  low: { color: 'var(--color-low)', shape: 'circle', label: 'Low' },
};

export function markerStyle(report: Pick<Report, 'priority'>): MarkerStyle {
  return STYLES[report.priority] ?? STYLES.low;
}
