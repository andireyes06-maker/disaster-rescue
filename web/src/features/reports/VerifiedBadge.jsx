export default function VerifiedBadge({ verified }) {
  return (
    <span className={`badge ${verified ? 'badge--verified' : 'badge--pending'}`}>
      <span aria-hidden="true">{verified ? '✓' : '○'}</span>
      <span>{verified ? 'Verified' : 'Pending'}</span>
    </span>
  );
}
