const ICONS = { critical: '⚠', high: '▲', medium: '◆', low: '▼' };

export default function PriorityBadge({ priority }) {
  const p = ICONS[priority] ? priority : 'low';
  return (
    <span className={`badge badge--${p}`}>
      <span aria-hidden="true">{ICONS[p]}</span>
      <span>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
    </span>
  );
}
