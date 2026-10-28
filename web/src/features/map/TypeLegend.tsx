import { REPORT_TYPE_LIST } from '../../lib/reportTypes';
import { DisasterSymbol } from './disasterSymbols';

// A legend, not a control: one tinted chip per emergency type, showing the same symbol the map pins use.
// Colour is never the only signal; each chip carries the symbol and the name.
export default function TypeLegend() {
  return (
    <div className="type-legend">
      <span className="type-legend__label">Type</span>
      <ul className="type-legend__chips" aria-label="Emergency types">
        {REPORT_TYPE_LIST.map((t) => (
          <li key={t.key} className={`type-chip type-chip--${t.key}`}><DisasterSymbol type={t.key} />{t.label}</li>
        ))}
      </ul>
    </div>
  );
}
