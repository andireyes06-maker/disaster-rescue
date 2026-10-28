import { describe, it, expect } from 'vitest';
import { REPORT_TYPE_LIST, typeLabel, typeMeta } from './reportTypes';
import { REPORT_TYPES } from '../types/domain';

describe('report type registry', () => {
  it('has the 8 keys and labels in the agreed order', () => {
    expect(REPORT_TYPE_LIST.map((t) => t.key)).toEqual(['flood', 'fire', 'earthquake', 'landslide', 'medical', 'road_hazard', 'power_line', 'other']);
    expect(REPORT_TYPE_LIST.map((t) => t.label)).toEqual(['Flood', 'Fire', 'Earthquake', 'Landslide', 'Lifeline', 'Roadblock', 'Live Wire', 'Other']);
    expect([...REPORT_TYPES]).toEqual(REPORT_TYPE_LIST.map((t) => t.key));
  });
  it('gives every type an icon and a style class', () => {
    for (const t of REPORT_TYPE_LIST) {
      expect(t.icon).toBeTruthy();
      expect(t.className).toBe(`type-icon--${t.key}`);
    }
  });
  it('treats an unknown or empty key as Other', () => {
    expect(typeMeta('nope').key).toBe('other');
    expect(typeMeta('').key).toBe('other');
  });
  it('labels a type, the typed Other, and an unknown key', () => {
    expect(typeLabel('road_hazard')).toBe('Roadblock');
    expect(typeLabel('other', 'gas leak')).toBe('Other: gas leak');
    expect(typeLabel('other')).toBe('Other');
    expect(typeLabel('')).toBe('Other');
    expect(typeLabel('zzz')).toBe('Other');
    expect(typeLabel('flood', 'ignored')).toBe('Flood');
  });
});
