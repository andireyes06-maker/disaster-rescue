import { describe, it, expect } from 'vitest';
import { markerStyle } from './markerStyle';
import { makeReport } from '../reports/fixtures';
import { PRIORITIES } from '../../types/domain';

describe('markerStyle', () => {
  it('gives every priority a distinct shape and label', () => {
    const styles = PRIORITIES.map((priority) => markerStyle(makeReport({ priority })));
    expect(new Set(styles.map((s) => s.shape)).size).toBe(PRIORITIES.length);
    expect(new Set(styles.map((s) => s.label)).size).toBe(PRIORITIES.length);
    for (const s of styles) expect(s.label.trim()).not.toBe('');
  });

  it('uses coral for critical only', () => {
    for (const priority of PRIORITIES) {
      const { color } = markerStyle(makeReport({ priority }));
      if (priority === 'critical') expect(color).toBe('var(--color-critical)');
      else expect(color).not.toBe('var(--color-critical)');
    }
  });
});
