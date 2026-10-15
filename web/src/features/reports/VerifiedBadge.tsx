interface VerifiedBadgeProps {
  verified: boolean;
}

export default function VerifiedBadge({ verified }: VerifiedBadgeProps) {
  return (
    <span className={`badge ${verified ? 'badge--verified' : 'badge--pending'}`}>
      <span aria-hidden="true">{verified ? '✓' : '○'}</span>
      <span>{verified ? 'Verified' : 'Pending'}</span>
    </span>
  );
}
