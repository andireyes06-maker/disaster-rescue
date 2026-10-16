import { Check, Circle } from 'lucide-react';

interface VerifiedBadgeProps {
  verified: boolean;
}

export default function VerifiedBadge({ verified }: VerifiedBadgeProps) {
  const Icon = verified ? Check : Circle;
  return (
    <span className={`badge ${verified ? 'badge--verified' : 'badge--pending'}`}>
      <Icon aria-hidden="true" />
      <span>{verified ? 'Verified' : 'Pending'}</span>
    </span>
  );
}
