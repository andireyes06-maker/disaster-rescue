export const ACTION_NAMES: Record<string, string> = {
  'report.create': 'Report submitted', 'report.verify': 'Report verified',
  'report.assign': 'Team assigned', 'report.acknowledge': 'Assignment acknowledged',
  'report.update': 'Response update', 'report.reject': 'Report rejected',
  'report.duplicate': 'Duplicate marked', 'report.cancel': 'Report cancelled',
  'report.close': 'Report closed', 'status.change': 'Status changed',
  'report.priority': 'Priority changed', 'report.classify': 'Classification changed',
  'settings.update': 'Settings updated', 'user.create': 'Account created',
  'user.update': 'Account updated', 'team.create': 'Team created', 'team.update': 'Team updated',
};

const FIELDS: Record<string, string> = {
  assignedTeamId: 'Assigned team', assignedTeamIds: 'Assigned teams', team: 'Team', teamId: 'Team',
  duplicateOf: 'Related report', target: 'Account', peopleRescued: 'People rescued',
  verified: 'Verification', active: 'Account access', verifiedBy: 'Verified by', verifiedAt: 'Verified at',
  at: 'Changed at', status: 'Status', reason: 'Reason', priority: 'Priority', severity: 'Severity',
  role: 'Role', kind: 'Team type', kindLabel: 'Team type label', name: 'Name',
  nextAttemptAtMs: 'Next attempt', hq: 'Headquarters', hqName: 'Headquarters place',
};

export function readableName(value: string): string {
  const text = value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const actionName = (code: string) => ACTION_NAMES[code] || readableName(code);
export const fieldName = (field: string) => FIELDS[field] || readableName(field);

export interface AuditNames {
  users: Record<string, string>;
  reports: Record<string, string>;
  teams: Record<string, string>;
}

// A record ID is never shown in full. Use the loaded name, or a short label that says what kind of record it is.
const SHORT_ID = 6;
function recordLabel(kind: 'Team' | 'Report' | 'Account', id: string, directory: Record<string, string>): string {
  return directory[id] || `${kind} ${id.slice(0, SHORT_ID)}`;
}

function teamLabel(id: string, names: AuditNames) { return recordLabel('Team', id, names.teams); }
function reportLabel(id: string, names: AuditNames) { return recordLabel('Report', id, names.reports); }
function accountLabel(id: string, names: AuditNames) { return recordLabel('Account', id, names.users); }

const TEAM_FIELDS = new Set(['assignedTeamId', 'assignedTeamIds', 'team', 'teamId']);
const ACCOUNT_FIELDS = new Set(['target', 'actorUid']);
const REPORT_FIELDS = new Set(['duplicateOf', 'reportId']);
const DATE_FIELDS = new Set(['at', 'verifiedAt', 'createdAt', 'closedAt']);

/** A readable date and time, or null when the value is not a date. */
export function formatWhen(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
}

// Headquarters: the place name recorded with the same event, else readable coordinates.
// Never a serialized object, and never a name assumed for an older entry that did not record one.
export function headquartersValue(value: unknown, recordedName?: unknown): string {
  if (value === undefined || value === null) return 'Not recorded';
  if (typeof recordedName === 'string' && recordedName.trim()) return recordedName.trim();
  const point = value as { lat?: unknown; lng?: unknown };
  if (typeof point.lat === 'number' && typeof point.lng === 'number' && Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
    return `Coordinates ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
  }
  return 'Location not readable';
}

function plainValue(field: string, value: unknown, names: AuditNames): string {
  if (typeof value === 'string') {
    if (TEAM_FIELDS.has(field)) return teamLabel(value, names);
    if (REPORT_FIELDS.has(field)) return reportLabel(value, names);
    if (ACCOUNT_FIELDS.has(field)) return accountLabel(value, names);
    return value;
  }
  if (typeof value === 'boolean') {
    if (field === 'active') return value ? 'Active' : 'Inactive';
    if (field === 'verified') return value ? 'Verified' : 'Not verified';
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') return DATE_FIELDS.has(field) || field.endsWith('AtMs') ? formatWhen(value) ?? String(value) : String(value);
  return String(value);
}

export function namedValue(field: string, value: unknown, names: AuditNames, recordedName?: unknown): string {
  if (field === 'hq') return headquartersValue(value, recordedName);
  if (value === undefined || value === null) return 'Not recorded';
  // Verification stores { uid, name }. Show the name, then the directory name for that uid, never the raw ID first.
  if (field === 'verifiedBy' && typeof value === 'object') {
    const who = value as { uid?: unknown; name?: unknown };
    if (typeof who.name === 'string' && who.name) return who.name;
    if (typeof who.uid === 'string') return names.users[who.uid] || 'Name not recorded';
    return 'Not recorded';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None';
    return value.map((item) => (typeof item === 'string' ? plainValue(field, item, names) : namedValue(field, item, names))).join(', ');
  }
  if (DATE_FIELDS.has(field) || field.endsWith('AtMs')) {
    const when = formatWhen(value as string | number);
    if (when) return when;
  }
  if (typeof value === 'object') {
    // Settings and similar records: one labelled line per key, so nothing reads as a raw object.
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return 'None';
    return entries.map(([k, v]) => `${fieldName(k)}: ${namedValue(k, v, names)}`).join('; ');
  }
  return plainValue(field, value, names);
}
