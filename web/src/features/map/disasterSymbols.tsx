import type { ReportType } from '../../types/domain';
// Shared, fixed geometry: map pins and legend use the exact same symbols.
const PATHS: Record<ReportType, string[]> = {
  flood: ['M2 6c3-4 5 4 8 0s5 4 8 0 4 0 4 0', 'M2 12c3-4 5 4 8 0s5 4 8 0 4 0 4 0', 'M2 18c3-4 5 4 8 0s5 4 8 0 4 0 4 0'],
  fire: ['M13 2c1 5-4 6-4 10 0 2 1 3 3 3 3 0 3-4 4-5 4 4 5 7 2 10-4 4-12 1-12-5 0-5 5-7 7-13Z'],
  earthquake: ['M4 21V5h7M14 3h6v18M2 21h20M8 9h1m7-2h1m-1 5h1', 'm13 3-3 7 4 3-3 8'],
  landslide: ['m2 20 8-16 7 13 3-7 3 10H2Z', 'm8 13 3-2 3 2m4-9 1 1m2 2 1 1'],
  medical: ['M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11Z', 'M7 12h2.5l1.5-3 2 6 1.5-3H17'],
  road_hazard: ['M12 3 22 20H2L12 3Z', 'M7.5 15h9', 'M9.8 10.5h4.4'],
  power_line: ['M13 2 5 12.5h6L10 19l8-10.5h-6L13 2Z', 'M2 22c4-2 6-2 10 0s6 2 10 0'],
  other: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 3h.01'],
};
const pathsFor = (type: string) => PATHS[type as ReportType] ?? PATHS.other;
export function DisasterSymbol({ type }: { type: string }) { return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{pathsFor(type).map((d, i) => <path key={i} d={d} />)}</svg>; }
export function disasterSymbolHtml(type: string) { return `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${pathsFor(type).map(d => `<path d="${d}"/>`).join('')}</svg>`; }
