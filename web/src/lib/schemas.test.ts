import { describe, it, expect } from 'vitest';
import {
  operationUpdateSchema,
  assignTeamSchema,
  teamNameSchema,
  staffAccountSchema,
  PEOPLE_RESCUED_ERROR,
  MAX_PEOPLE_RESCUED,
  MAX_NOTE_LENGTH,
  ASSIGN_TEAM_ERROR,
  webReportSchema,
} from './schemas';

const validOperation = { status: 'Resolved', peopleRescued: 3, note: 'Family moved to the shelter' };

function countError(peopleRescued: unknown): string | undefined {
  const result = operationUpdateSchema.safeParse({ ...validOperation, peopleRescued });
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === 'peopleRescued')?.message;
}

describe('operationUpdateSchema', () => {
  it('accepts a valid update', () => {
    expect(operationUpdateSchema.safeParse(validOperation).success).toBe(true);
  });

  it.each([0, 1, MAX_PEOPLE_RESCUED])('accepts whole counts at the bounds (%s)', (n) => {
    expect(countError(n)).toBeUndefined();
  });

  it.each([-1, MAX_PEOPLE_RESCUED + 1, 1e9])('rejects counts outside 0 to 10000 (%s)', (n) => {
    expect(countError(n)).toBe(PEOPLE_RESCUED_ERROR);
  });

  it.each([2.5, 0.1, Number.NaN])('rejects non-integer counts (%s)', (n) => {
    expect(countError(n)).toBe(PEOPLE_RESCUED_ERROR);
  });

  it('accepts only the two known statuses', () => {
    expect(operationUpdateSchema.safeParse({ ...validOperation, status: 'Rescue in Progress' }).success).toBe(true);
    expect(operationUpdateSchema.safeParse({ ...validOperation, status: 'Closed' }).success).toBe(false);
  });

  it('accepts a note of exactly the maximum length', () => {
    const note = 'a'.repeat(MAX_NOTE_LENGTH);
    expect(operationUpdateSchema.safeParse({ ...validOperation, note }).success).toBe(true);
  });

  it('rejects a note over the maximum length', () => {
    const note = 'a'.repeat(MAX_NOTE_LENGTH + 1);
    const result = operationUpdateSchema.safeParse({ ...validOperation, note });
    expect(result.success).toBe(false);
  });

  it('trims the note before the length check and before submit', () => {
    const note = `  ${'a'.repeat(MAX_NOTE_LENGTH)}  `;
    const result = operationUpdateSchema.safeParse({ ...validOperation, note });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.note).toHaveLength(MAX_NOTE_LENGTH);
  });
});

describe('assignTeamSchema', () => {
  const schema = assignTeamSchema(['t1', 't3']);

  it('accepts a free team from the list', () => {
    expect(schema.safeParse({ teamId: 't3' }).success).toBe(true);
  });

  it('rejects an empty team id', () => {
    const result = schema.safeParse({ teamId: '' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe(ASSIGN_TEAM_ERROR);
  });

  it('rejects a team that is busy or unknown', () => {
    expect(schema.safeParse({ teamId: 't2' }).success).toBe(false);
    expect(schema.safeParse({ teamId: 'ghost' }).success).toBe(false);
  });
});

describe('teamNameSchema', () => {
  it('trims and accepts names of 1 to 100 characters', () => {
    expect(teamNameSchema.safeParse({ name: '  Alpha  ' }).success).toBe(true);
    expect(teamNameSchema.safeParse({ name: 'a'.repeat(100) }).success).toBe(true);
  });

  it('rejects a blank name and a name over 100 characters', () => {
    expect(teamNameSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(teamNameSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false);
  });
});

describe('staffAccountSchema', () => {
  const valid = { email: 'a@example.org', name: 'Ana', role: 'responder', team: '', password: 'Harbor-test-2026' };

  it('accepts a staff account with no team', () => {
    expect(staffAccountSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['dispatcher', 'dmo'])('does not offer the %s role, which has no website access', (role) => {
    expect(staffAccountSchema.safeParse({ ...valid, role }).success).toBe(false);
  });

  it('rejects an unknown role and a blank email', () => {
    expect(staffAccountSchema.safeParse({ ...valid, role: 'dispatcher' }).success).toBe(false);
    expect(staffAccountSchema.safeParse({ ...valid, email: '  ' }).success).toBe(false);
  });
});

describe('webReportSchema type', () => {
  const ok = { type: 'flood', description: 'Water rising', lat: 14.85, lng: 120.81, source: 'gps' as const, addressText: '' };
  const messages = (input: unknown) => {
    const r = webReportSchema.safeParse(input);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  };
  it.each(['flood', 'fire', 'earthquake', 'landslide', 'medical', 'road_hazard', 'power_line'])('accepts %s', (type) => {
    expect(webReportSchema.safeParse({ ...ok, type }).success).toBe(true);
  });
  it('rejects a type outside the 8', () => { expect(webReportSchema.safeParse({ ...ok, type: 'tornado' }).success).toBe(false); });
  it('Other needs the typed text', () => {
    expect(messages({ ...ok, type: 'other' })).toContain('Say what kind of emergency this is.');
    expect(messages({ ...ok, type: 'other', typeDetail: '   ' })).toContain('Say what kind of emergency this is.');
  });
  it('Other text must be 3 to 40 characters', () => {
    expect(messages({ ...ok, type: 'other', typeDetail: 'ab' })).toContain('Describe it in 3 to 40 characters.');
    expect(messages({ ...ok, type: 'other', typeDetail: 'a'.repeat(41) })).toContain('Describe it in 3 to 40 characters.');
    const r = webReportSchema.safeParse({ ...ok, type: 'other', typeDetail: '  gas leak ' });
    expect(r.success && r.data.typeDetail).toBe('gas leak');
  });
  it('drops a typed text on any other type', () => {
    const r = webReportSchema.safeParse({ ...ok, type: 'flood', typeDetail: 'gas leak' });
    expect(r.success && r.data.typeDetail).toBeUndefined();
  });
});
