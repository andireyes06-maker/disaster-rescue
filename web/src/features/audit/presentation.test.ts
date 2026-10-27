import { describe, expect, it } from 'vitest';
import { headquartersValue, namedValue } from './presentation';

const names = { users: {}, reports: {}, teams: {} };
const point = { lat: 7.080621198720183, lng: 125.54626464843751 };

describe('headquartersValue', () => {
  it('shows the place name recorded with the same event', () => {
    expect(headquartersValue(point, 'Guiguinto, Bulacan')).toBe('Guiguinto, Bulacan');
  });

  it('falls back to readable coordinates, not a serialized object, when no name was recorded', () => {
    const text = headquartersValue(point);
    expect(text).toBe('Coordinates 7.08062, 125.54626');
    expect(text).not.toContain('{');
    expect(text).not.toContain('"lat"');
  });

  it('ignores a blank recorded name and keeps the coordinate fallback', () => {
    expect(headquartersValue(point, '   ')).toBe('Coordinates 7.08062, 125.54626');
  });

  it('shows Not recorded for an empty previous headquarters', () => {
    expect(headquartersValue(null)).toBe('Not recorded');
    expect(headquartersValue(undefined)).toBe('Not recorded');
  });

  it('does not invent a name for a malformed point', () => {
    expect(headquartersValue({ lat: 'x' })).toBe('Location not readable');
  });

  it('is used by namedValue for the hq field only', () => {
    expect(namedValue('hq', point, names, 'Guiguinto, Bulacan')).toBe('Guiguinto, Bulacan');
    expect(namedValue('hq', null, names)).toBe('Not recorded');
  });
});

describe('readable audit values', () => {
  const dir = { users: { u1: 'Ana Reyes' }, reports: {}, teams: { tA: 'Harbor Alpha' } };
  const longId = 'k3Jd8sQx9LmPz2Wn7Rt4';

  it('never shows a full record ID when no name is loaded', () => {
    const text = namedValue('reportId', longId, dir);
    expect(text).toBe('Report k3Jd8s');
    expect(namedValue('target', longId, dir)).toBe('Account k3Jd8s');
    expect(namedValue('assignedTeamId', longId, dir)).toBe('Team k3Jd8s');
  });

  it('shows loaded names', () => {
    expect(namedValue('assignedTeamId', 'tA', dir)).toBe('Harbor Alpha');
    expect(namedValue('target', 'u1', dir)).toBe('Ana Reyes');
  });

  it('turns a list of team IDs into names, without brackets or quotes', () => {
    expect(namedValue('assignedTeamIds', ['tA', longId], dir)).toBe(`Harbor Alpha, Team ${longId.slice(0, 6)}`);
    expect(namedValue('assignedTeamIds', [], dir)).toBe('None');
  });

  it('formats a timestamp as a date and time, not an ISO string', () => {
    const iso = '2026-10-27T10:30:00.000Z';
    const text = namedValue('verifiedAt', iso, dir);
    expect(text).toBe(new Date(iso).toLocaleString());
    expect(text).not.toContain('T10');
    expect(namedValue('nextAttemptAtMs', Date.UTC(2026, 9, 27), dir)).toBe(new Date(Date.UTC(2026, 9, 27)).toLocaleString());
  });

  it('shows a settings object as labelled lines, not JSON', () => {
    const text = namedValue('settings', { reach: 500, label: 'Main' }, dir);
    expect(text).toBe('Reach: 500; Label: Main');
    expect(text).not.toContain('{');
    expect(text).not.toContain('"');
    expect(text).toContain('500');
    expect(text).toContain('Main');
  });

  it('keeps reasons and statuses as written', () => {
    expect(namedValue('reason', 'Duplicate of an open report', dir)).toBe('Duplicate of an open report');
    expect(namedValue('status', 'Team Assigned', dir)).toBe('Team Assigned');
  });
});
