import type { ReactNode } from 'react';

export type BadgeTone = 'status' | 'critical' | 'high' | 'medium' | 'low' | 'neutral';

// Always renders text: colour is never the only signal.
export default function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}
