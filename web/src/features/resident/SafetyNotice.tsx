import type { Hotlines } from './useHotlines';

const DEFAULT_NOTICE = 'Submitting a report does not guarantee immediate rescue. If you are in danger, call the emergency hotline now.';
// Used when no number is configured. It gives no number and makes no call promise the app cannot back up (F-release 3).
const NO_NUMBER_NOTICE = 'Submitting a report does not guarantee immediate rescue. If you are in danger, call your local emergency number.';

export default function SafetyNotice({ hotlines }: { hotlines: Hotlines }) {
  const hasNumbers = hotlines.numbers.length > 0;
  return (
    <section className="card safety-notice" aria-labelledby="safety-title">
      <h2 id="safety-title">{hasNumbers ? 'If you are in danger, call now' : 'Safety information'}</h2>
      <p>{hotlines.residentNotice || (hasNumbers ? DEFAULT_NOTICE : NO_NUMBER_NOTICE)}</p>
      <ul className="safety-notice__numbers">
        {hotlines.numbers.map((h) => (
          <li key={`${h.label}-${h.number}`}>
            {h.label}: <a href={`tel:${h.number.replace(/[^0-9+]/g, '')}`}>{h.number}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
