export default function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand-lockup"><span className="brand-symbol" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#6d28d9"/><circle cx="32" cy="28.6" r="11.3" fill="#fff"/><path d="M25.2 34.6 L32 48.1 L38.8 34.6 Z" fill="#fff"/></svg></span>{!compact && <span>I-<span className="brand-lockup__light">Report</span></span>}</span>;
}
