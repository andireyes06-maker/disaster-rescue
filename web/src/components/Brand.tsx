import { Cross } from 'lucide-react';

export default function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand-lockup"><span className="brand-symbol" aria-hidden="true"><Cross size={21} strokeWidth={2.5} /></span>{!compact && <span>Rescue{' '}<span className="brand-lockup__light">Reports</span></span>}</span>;
}
