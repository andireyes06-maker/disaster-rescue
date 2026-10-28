import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REPORT_TYPES, REPORT_TYPE_KEYS } from '../../src/domain/reportTypes.js';

const repoFile = (rel) => readFileSync(fileURLToPath(new URL(`../../../${rel}`, import.meta.url)), 'utf8');

// Web: one `{ key: 'x', label: 'Y', description: 'Z', ... }` entry per line.
const webEntries = () => [...repoFile('web/src/lib/reportTypes.ts').matchAll(/key: '([a-z_]+)', label: '([^']+)', description: '([^']+)'/g)]
  .map((m) => ({ key: m[1], label: m[2], description: m[3] }));

// Phone: the `reportTypes` list, the `reportTypeLabels` map (one entry per line) and the chooser lines in `reportTypeInfo`.
const phoneKeys = () => {
  const block = repoFile('mobile/lib/data/report_models.dart').match(/const reportTypes = \[([^\]]*)\];/)[1];
  return [...block.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
};
const phoneLabels = () => {
  const block = repoFile('mobile/lib/data/report_models.dart').match(/const reportTypeLabels = <String, String>\{([^}]*)\};/)[1];
  return [...block.matchAll(/^\s*'([a-z_]+)': '([^']+)',$/gm)].map((m) => ({ key: m[1], label: m[2] }));
};
const phoneDetails = () => {
  const text = repoFile('mobile/lib/features/report/report_flow_page.dart');
  const block = text.slice(text.indexOf('const reportTypeInfo = <String, ReportTypeInfo>{'), text.indexOf('/// The entry for a stored type key'));
  return [...block.matchAll(/ReportTypeInfo\(\s*'([a-z_]+)',\s*Icons\.[a-z_]+,\s*'([^']+)',?\s*\)/g)].map((m) => ({ key: m[1], description: m[2] }));
};

describe('report type registries', () => {
  it('the web registry matches the API: keys, labels and chooser lines, in order', () => {
    expect(webEntries()).toEqual(REPORT_TYPES.map(({ key, label, description }) => ({ key, label, description })));
  });
  it('the phone list matches the API keys in order', () => {
    expect(phoneKeys()).toEqual(REPORT_TYPE_KEYS);
  });
  it('the phone labels match the API labels in order', () => {
    expect(phoneLabels()).toEqual(REPORT_TYPES.map(({ key, label }) => ({ key, label })));
  });
  it('the phone chooser lines match the API descriptions in order', () => {
    expect(phoneDetails()).toEqual(REPORT_TYPES.map(({ key, description }) => ({ key, description })));
  });
});
