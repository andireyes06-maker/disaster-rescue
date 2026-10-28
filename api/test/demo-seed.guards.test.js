import { describe, expect, it } from 'vitest';
import { assertEmulatorOnly, parseArgs } from '../scripts/seed-demo.js';
import { buildScenario, buildQaScenario } from '../../demo-data/scenario.mjs';
import { buildPresentationScenario } from '../../demo-data/presentation.mjs';
import { PROVINCES } from '../src/domain/areas.js';
import { inPhilippines } from '../src/domain/serviceArea.js';

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

// The sample pins sit in Bulacan towns. Each town has a centre; a pin must lie within about 3 km of its town's centre.
const TOWNS = {
  Guiguinto: [14.8333, 120.8833], Malolos: [14.8433, 120.8114], Bulakan: [14.7936, 120.8794], Balagtas: [14.815, 120.9097],
  Bocaue: [14.7986, 120.9261], Marilao: [14.7581, 120.9553], Meycauayan: [14.737, 120.9608], Plaridel: [14.8858, 120.8556],
};

describe('demo seed locality', () => {
  const sets = { default: buildScenario(), qa: buildQaScenario(), presentation: buildPresentationScenario() };
  for (const [name, scenario] of Object.entries(sets)) {
    it(`${name}: every report has a non-empty Bulacan town locality that matches its pin, never a province`, () => {
      expect(scenario.reports.length).toBeGreaterThan(0);
      for (const r of scenario.reports) {
        expect(typeof r.locality, r.id).toBe('string');
        expect(r.locality.trim(), r.id).not.toBe('');
        expect(PROVINCES, r.id).not.toContain(r.locality);
        expect(Object.keys(TOWNS), r.id).toContain(r.locality);
        const [lat, lng] = TOWNS[r.locality];
        expect(Math.hypot(r.location.lat - lat, r.location.lng - lng), r.id).toBeLessThan(0.03);
        expect(inPhilippines(r.location.lat, r.location.lng), r.id).toBe(true);
      }
    });
  }
  for (const name of ['default', 'presentation']) {
    it(`${name}: the seeded reports cover at least 4 distinct towns`, () => {
      expect(new Set(sets[name].reports.map((r) => r.locality)).size).toBeGreaterThanOrEqual(4);
    });
  }
});
