import { describe, expect, it } from 'vitest';
import { buildPresentationScenario } from '../../demo-data/presentation.mjs';
import { buildScenario, DEFAULT_NOW } from '../../demo-data/scenario.mjs';
import { assertPresentationEnvironment, PROJECT } from '../scripts/start-presentation.mjs';
import { seedDemo } from '../scripts/seed-demo.js';

describe('isolated Harbor presentation', () => {
  const env = { FIREBASE_PROJECT_ID: PROJECT, GCLOUD_PROJECT: PROJECT, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8290', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9399' };
  it('refuses live, QA, remote, and incomplete emulator environments', () => {
    expect(() => assertPresentationEnvironment(env)).not.toThrow();
    for (const override of [
      { FIREBASE_PROJECT_ID: 'flutter-5094e' }, { GCLOUD_PROJECT: 'demo-disaster-rescue' },
      { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8190' }, { FIREBASE_AUTH_EMULATOR_HOST: '' },
      { FIRESTORE_EMULATOR_HOST: 'remote.example:8290' },
    ]) expect(() => assertPresentationEnvironment({ ...env, ...override })).toThrow(/Refusing/);
  });
  it('does not seed presentation into the QA project', async () => {
    await expect(seedDemo({ db: { projectId: 'demo-disaster-rescue' }, auth: {} }, { now: DEFAULT_NOW, scenario: 'presentation' })).rejects.toThrow(/isolated/);
  });
  it('preserves linked reports, teams, histories, and calculated counts without synthetic evidence', () => {
    const original = buildScenario({ now: DEFAULT_NOW });
    const presentation = buildPresentationScenario({ now: DEFAULT_NOW });
    expect(presentation.reports).toHaveLength(24);
    expect(presentation.reports.every((r) => r.photos.length === 0)).toBe(true);
    expect(presentation.updates).toEqual(original.updates);
    expect(presentation.teams).toEqual(original.teams);
    expect(presentation.audit).toEqual(original.audit);
    expect(original.reports.some((r) => r.photos.length)).toBe(true);
    for (const account of presentation.accounts) expect(account.email).toMatch(/@harbor\.example$/);
    for (const report of presentation.reports) {
      expect(report.description + report.addressText).not.toMatch(/fixture|lost-response|QA|demo/i);
      expect(presentation.accounts.some((a) => a.uid === report.reporterId)).toBe(true);
    }
  });
});
