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
  assignedTeamId: 'Assigned team', duplicateOf: 'Related report', target: 'Account',
  peopleRescued: 'People rescued', verified: 'Verification', active: 'Account access',
  verifiedBy: 'Verified by',
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

export function namedValue(field: string, value: unknown, names: AuditNames): string {
  if (value === undefined || value === null) return 'Not recorded';
  // Verification stores { uid, name }. Show the name, then the directory name for that uid, never the raw ID first.
  if (field === 'verifiedBy' && typeof value === 'object') {
    const who = value as { uid?: unknown; name?: unknown };
    if (typeof who.name === 'string' && who.name) return who.name;
    if (typeof who.uid === 'string') return names.users[who.uid] || 'Name not recorded';
    return 'Not recorded';
  }
  if (typeof value === 'string') {
    if (field === 'assignedTeamId' || field === 'team') return names.teams[value] || value;
    if (field === 'duplicateOf' || field === 'reportId') return names.reports[value] || value;
    if (field === 'target' || field === 'actorUid') return names.users[value] || value;
    return value;
  }
  if (typeof value === 'boolean') {
    if (field === 'active') return value ? 'Active' : 'Inactive';
    if (field === 'verified') return value ? 'Verified' : 'Not verified';
    return value ? 'Yes' : 'No';
  }
  return JSON.stringify(value) ?? String(value);
}
