import type { CSSProperties, ReactNode } from 'react';

// Placeholder for content that is still loading (W06). The shapes are decorative and hidden from assistive
// technology; the region gets one status message, so screen readers announce loading once, not per block.
export function Skeleton({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className="skeleton" role="status" aria-busy="true">
      <span className="visually-hidden">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function SkeletonRows({ rows = 4, height = 64 }: { rows?: number; height?: number }) {
  const style: CSSProperties = { height };
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-block" style={style} />
      ))}
    </>
  );
}
