import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { AREAS, PROVINCES, METRO_MANILA } from '../../src/domain/areas.js';
import { parseReportInput } from '../../src/domain/validation.js';

const repoFile = (rel) => readFileSync(fileURLToPath(new URL(`../../../${rel}`, import.meta.url)), 'utf8');
// Each name is a single-quoted string on its own line in the generated files.
const quoted = (text) => [...text.matchAll(/^\s*'([^']+)',?$/gm)].map((m) => m[1]);

describe('area list', () => {
  it('has 82 provinces and 17 Metro Manila cities and municipalities, with no duplicates', () => {
    expect(PROVINCES).toHaveLength(82);
    expect(METRO_MANILA).toHaveLength(17);
    expect(new Set(AREAS).size).toBe(AREAS.length);
  });

  it('the phone list matches the API list in order', () => {
    expect(quoted(repoFile('mobile/lib/data/areas.dart'))).toEqual([...AREAS]);
  });

  it('the web list matches the API list in order', () => {
    expect(quoted(repoFile('web/src/lib/areas.ts'))).toEqual([...AREAS]);
  });

  it('a report must name an area from the list', () => {
    const base = { type: 'flood', description: 'Water rising', lat: '14.85', lng: '120.81', source: 'gps' };
    expect(() => parseReportInput(base)).toThrow(expect.objectContaining({ status: 400 }));
    expect(() => parseReportInput({ ...base, area: 'Atlantis' })).toThrow(expect.objectContaining({ status: 400 }));
    expect(parseReportInput({ ...base, area: 'Quezon City' }).area).toBe('Quezon City');
  });
});
