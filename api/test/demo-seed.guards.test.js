import { describe, expect, it } from 'vitest';
import { assertEmulatorOnly, parseArgs } from '../scripts/seed-demo.js';
import { buildScenario, buildQaScenario } from '../../demo-data/scenario.mjs';
import { buildPresentationScenario } from '../../demo-data/presentation.mjs';
import { PROVINCES } from '../src/domain/areas.js';

const EMU = { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8190', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9299', FIREBASE_PROJECT_ID: 'demo-disaster-rescue' };

describe('demo seed guards', () => {
  it('allows emulator hosts with a demo project', () => {
    expect(assertEmulatorOnly(EMU, [])).toBeNull();
  });

  it('refuses without both emulator hosts', () => {
    expect(assertEmulatorOnly({ ...EMU, FIREBASE_AUTH_EMULATOR_HOST: '' }, [])).toMatch(/emulators:exec/);
    expect(assertEmulatorOnly({ ...EMU, FIRESTORE_EMULATOR_HOST: '' }, [])).toMatch(/emulators:exec/);
  });

  it('refuses a non-demo project, including the production project', () => {
    expect(assertEmulatorOnly({ ...EMU, FIREBASE_PROJECT_ID: 'flutter-5094e' }, [])).toMatch(/not a demo project/);
  });

  it('refuses --real and any --project flag', () => {
    expect(assertEmulatorOnly(EMU, ['--real'])).toMatch(/never targets a live project/);
    expect(assertEmulatorOnly(EMU, ['--project', 'flutter-5094e'])).toMatch(/never targets a live project/);
  });

  it('parses --reset and --now', () => {
    expect(parseArgs(['--reset', '--now', '2026-10-01T00:00:00Z'])).toEqual({ reset: true, scenario: 'default', now: '2026-10-01T00:00:00Z' });
    expect(parseArgs(['--scenario', 'qa']).scenario).toBe('qa');
    expect(parseArgs([]).reset).toBe(false);
  });
});

// The sample pins sit in Metro Manila. Manila's bounds here are rough: north of 14.62 or east of 121.02 is Quezon City.
const townFor = ({ lat, lng }) => (lat >= 14.62 || lng >= 121.02 ? 'Quezon City' : 'Manila');

describe('demo seed locality', () => {
  const sets = { default: buildScenario(), qa: buildQaScenario(), presentation: buildPresentationScenario() };
  for (const [name, scenario] of Object.entries(sets)) {
    it(`${name}: every report has a town or city locality that matches its pin, never a province`, () => {
      expect(scenario.reports.length).toBeGreaterThan(0);
      for (const r of scenario.reports) {
        expect(typeof r.locality, r.id).toBe('string');
        expect(r.locality.trim(), r.id).not.toBe('');
        expect(PROVINCES, r.id).not.toContain(r.locality);
        expect(r.locality, r.id).toBe(townFor(r.location));
      }
    });
  }
});
