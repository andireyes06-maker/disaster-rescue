import type { Hotlines } from './useHotlines';
import { PhoneCall } from 'lucide-react';

const DEFAULT_NOTICE = 'Submitting a report does not guarantee immediate rescue. If you are in danger, call the emergency hotline now.';

export default function SafetyNotice({ hotlines }: { hotlines: Hotlines }) {
  return (
    <section className="safety-notice" aria-labelledby="safety-title">
      <PhoneCall size={20} aria-hidden="true" />
      <div>
      <h2 id="safety-title">If you are in danger, call now</h2>
      <p>{hotlines.residentNotice || DEFAULT_NOTICE}</p>
      <ul className="safety-notice__numbers">
        {hotlines.numbers.map((h) => (
          <li key={`${h.label}-${h.number}`}>
            {h.label}: <a href={`tel:${h.number.replace(/[^0-9+]/g, '')}`}>{h.number}</a>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
