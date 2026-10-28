import { describe, it, expect } from 'vitest';
import { disasterSymbolHtml } from './disasterSymbols';
import { REPORT_TYPES } from '../../types/domain';

describe('disaster symbols', () => {
  it('draws something for every type', () => {
    for (const type of REPORT_TYPES) expect(disasterSymbolHtml(type)).toContain('<path');
  });
  it('draws a different symbol for each of the 8 types', () => {
    const drawings = REPORT_TYPES.map((t) => disasterSymbolHtml(t));
    expect(new Set(drawings).size).toBe(REPORT_TYPES.length);
  });
  it('draws the Other symbol for an unknown key', () => {
    expect(disasterSymbolHtml('zzz')).toBe(disasterSymbolHtml('other'));
  });
});
