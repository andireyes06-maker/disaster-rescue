import { describe, it, expect } from 'vitest';
import { REPORT_TYPES, REPORT_TYPE_KEYS, reportTypeLabel } from '../../src/domain/reportTypes.js';

describe('report type registry', () => {
  it('lists the 8 keys in the agreed order', () => {
    expect(REPORT_TYPE_KEYS).toEqual(['flood', 'fire', 'earthquake', 'landslide', 'medical', 'road_hazard', 'power_line', 'other']);
  });
  it('has the agreed labels and chooser descriptions', () => {
    expect(REPORT_TYPES.map((t) => t.label)).toEqual(['Flood', 'Fire', 'Earthquake', 'Landslide', 'Lifeline', 'Roadblock', 'Live Wire', 'Other']);
    expect(REPORT_TYPES.find((t) => t.key === 'medical').description).toBe('Someone needs urgent medical help');
    expect(REPORT_TYPES.find((t) => t.key === 'road_hazard').description).toBe('Blocked, damaged or unsafe road');
    expect(REPORT_TYPES.find((t) => t.key === 'power_line').description).toBe('Fallen, sparking or damaged power line');
  });
  it('labels a type, the typed Other, and an unknown key', () => {
    expect(reportTypeLabel('road_hazard')).toBe('Roadblock');
    expect(reportTypeLabel('other', 'gas leak')).toBe('Other: gas leak');
    expect(reportTypeLabel('other')).toBe('Other');
    expect(reportTypeLabel('zzz')).toBe('Other');
    expect(reportTypeLabel(undefined)).toBe('Other');
  });
  it('ignores a detail on a type that is not Other', () => {
    expect(reportTypeLabel('flood', 'x y z')).toBe('Flood');
  });
});
