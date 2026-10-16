/**
 * Repository port. Implemented by test/fakes/memoryRepo.js and
 * src/adapters/firestoreRepo.js. Keep REPO_METHODS in sync with both.
 *
 * @typedef {Object} ReportFilter
 * @property {string} [reporterId]
 * @property {string} [assignedTeamId]
 * @property {string} [status]
 * @property {string} [type]
 * @property {Date} [from] createdAt >= from
 * @property {Date} [to] createdAt <= to
 *
 * @typedef {Object} Repo
 * @property {(id: string) => Promise<object|null>} getReport
 * @property {(filter?: ReportFilter) => Promise<object[]>} listReports newest first
 * @property {() => Promise<object[]>} listOpenReports
 * @property {(data: object) => Promise<string>} createReport
 * @property {(id: string, expectedStatus: string, patch: object) => Promise<boolean>} updateReportIf atomic compare-and-set on status
 * @property {(reportId: string, update: object) => Promise<string>} addUpdate
 * @property {(reportId: string) => Promise<object[]>} listUpdates
 * @property {(uid: string) => Promise<object|null>} getUser
 * @property {(uid: string, data: object) => Promise<void>} createUser
 * @property {(uid: string, patch: object) => Promise<void>} updateUser
 * @property {() => Promise<object[]>} listUsers
 * @property {(uid: string, patch: object, guard: (target: object|null, otherActiveAdmins: object[]) => string|null) => Promise<{ok: boolean, reason?: string}>} setStaffGuarded
 * @property {(reportId: string, expectedStatus: string, change: object) => Promise<{ok: boolean, reason?: string}>} applyReportChange
 * @property {(uid: string, key: string, opts: {staleAfterMs: number}) => Promise<{state: 'new'|'pending'|'done', result?: object}>} claimSubmission
 * @property {(uid: string, key: string, result: object) => Promise<void>} completeSubmission
 * @property {(id: string) => Promise<object|null>} getTeam
 * @property {() => Promise<object[]>} listTeams
 * @property {(id: string|null, data: object) => Promise<string>} saveTeam
 * @property {(n: object) => Promise<string>} addNotification
 * @property {(uid: string) => Promise<object[]>} listNotifications
 * @property {(id: string, uid: string) => Promise<boolean>} markRead false unless owned by uid
 * @property {(uid: string, token: string) => Promise<void>} addDevice
 * @property {(uid: string) => Promise<string[]>} listDevices
 * @property {(token: string) => Promise<void>} removeDevice
 * @property {(entry: object) => Promise<string>} addAudit
 * @property {(filter?: object) => Promise<object[]>} listAudit
 * @property {() => Promise<object>} getHotlines
 * @property {(doc: object) => Promise<void>} saveHotlines
 */

export const REPO_METHODS = [
  'getReport', 'listReports', 'listOpenReports', 'createReport', 'updateReportIf',
  'addUpdate', 'listUpdates', 'applyReportChange', 'claimSubmission', 'completeSubmission',
  'getUser', 'createUser', 'updateUser', 'listUsers', 'setStaffGuarded',
  'getTeam', 'listTeams', 'saveTeam',
  'addNotification', 'listNotifications', 'markRead',
  'addDevice', 'listDevices', 'removeDevice',
  'addAudit', 'listAudit',
  'getHotlines', 'saveHotlines',
];
