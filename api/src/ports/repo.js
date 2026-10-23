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
 * @property {(filter?: ReportFilter) => Promise<object[]>} listReports newest first, Firestore pages of 500, explicit 413 above 10000 rows
 * @property {() => Promise<object[]>} listOpenReports
 * @property {(data: object) => Promise<string>} createReport
 * @property {(id: string, expectedStatus: string, patch: object) => Promise<boolean>} updateReportIf atomic compare-and-set on status
 * @property {(reportId: string, update: object) => Promise<string>} addUpdate
 * @property {(reportId: string) => Promise<object[]>} listUpdates
 * @property {(reportId: string) => Promise<number>} [sumPeopleRescued] Firestore aggregate over legacy and current history
 * @property {(filter: {role?: string, teamId?: string}) => AsyncIterable<string[]>} recipientPages active recipients in pages of 200
 * @property {(now: number, limit?: number) => Promise<object[]>} listMutationEffects due durable operational jobs
 * @property {(id: string, lease: object) => Promise<object|null>} claimMutationEffects
 * @property {(id: string, owner: string) => Promise<boolean>} completeMutationEffects
 * @property {(uid: string) => Promise<object|null>} getUser
 * @property {(uid: string, data: object) => Promise<void>} createUser
 * @property {(uid: string, patch: object) => Promise<void>} updateUser
 * @property {() => Promise<object[]>} listUsers
 * @property {(uid: string, patch: object, guard: (target: object|null, otherActiveAdmins: object[]) => string|null) => Promise<{ok: boolean, reason?: string}>} setStaffGuarded
 * @property {(reportId: string, expectedStatus: string, change: object) => Promise<{ok: boolean, reason?: string}>} applyReportChange
 * @property {(uid: string, key: string, opts: {fingerprint: string, now: number, reportId: string, reference: string, leaseMs: number}) => Promise<{mode: 'run'|'replay'|'pending'|'conflict'|'unresolved', generation?: number, reportId?: string, reference?: string, result?: object}>} claimSubmission decides and writes the claim in one transaction (domain/submission.js)
 * @property {(uid: string, key: string, opts: {generation: number, reportId: string, report: object, assetIds?: string[], now?: number}) => Promise<{mode: 'commit'|'replay'|'fenced'|'assets_unavailable', result?: object}>} commitSubmission writes the report, attaches the reserved photo assets and completes the claim atomically. 'assets_unavailable' writes nothing: an asset was abandoned by cleanup or was not reserved by this generation.
 * @property {(uid: string, key: string, opts: {generation: number, reportId: string, assetIds: string[], now: number}) => Promise<{mode: 'reserve'|'replay'|'fenced'|'collision', result?: object}>} reservePhotoAssets reserves unique asset ids in the server-only photo ledger before any bytes are sent
 * @property {(uid: string, key: string, opts: {generation: number, reportId: string, assetId: string, sizeBytes: number, mimeType: string}) => Promise<boolean>} recordPhotoAccepted records provider acceptance on a row still reserved for this owner
 * @property {(now: number, limit?: number) => Promise<object[]>} listDuePhotoAssets open or abandoned ledger rows whose next check is due
 * @property {(assetId: string, lease: {owner: string, now: number, leaseMs: number}) => Promise<object|null>} claimPhotoAssetForCleanup abandons or leases one row for destruction; null when nothing may be destroyed now
 * @property {(assetId: string, owner: string, outcome: 'ok'|'not_found'|'error', now: number) => Promise<boolean>} finishPhotoAssetCleanup records a destroy outcome for the owner that holds the lease
 * @property {(uid: string, key: string, generation: number) => Promise<boolean>} releaseSubmission gives back a claim held by this generation before commit
 * @property {(uid: string, key: string) => Promise<object|null>} getSubmission
 * @property {(id: string) => Promise<object|null>} getTeam
 * @property {() => Promise<object[]>} listTeams
 * @property {(id: string|null, data: object) => Promise<string>} saveTeam
 * @property {(n: object, eventId?: string) => Promise<string>} addNotification create-once when eventId is supplied
 * @property {(uid: string) => Promise<object[]>} listNotifications
 * @property {(id: string, uid: string) => Promise<boolean>} markRead false unless owned by uid
 * @property {(uid: string, token: string) => Promise<void>} addDevice
 * @property {(uid: string) => Promise<string[]>} listDevices
 * @property {(token: string) => Promise<void>} removeDevice
 * @property {(entry: object, eventId?: string) => Promise<string>} addAudit create-once when eventId is supplied
 * @property {(filter?: object) => Promise<object[]>} listAudit
 * @property {() => Promise<object>} getHotlines
 * @property {(doc: object) => Promise<void>} saveHotlines
 * @property {(now: number, limit?: number) => Promise<object[]>} listReportEffects bounded due work
 * @property {(reportId: string, lease: {owner: string, now: number, leaseMs: number}) => Promise<object|null>} claimReportEffects
 * @property {(reportId: string, owner: string) => Promise<boolean>} completeReportEffects
 * @property {() => Promise<object|null>} getDemoConfig null unless the demo seed has written config/demo
 */

export const REPO_METHODS = [
  'getReport', 'listReports', 'listOpenReports', 'createReport', 'updateReportIf',
  'addUpdate', 'listUpdates', 'getReportUpdate', 'applyReportChange', 'claimSubmission', 'commitSubmission', 'releaseSubmission', 'getSubmission',
  'getUser', 'createUser', 'completeUserProvisioning', 'discardUserProvisioning', 'updateUser', 'listUsers', 'setStaffGuarded',
  'getTeam', 'listTeams', 'saveTeam',
  'addNotification', 'listNotifications', 'markRead',
  'addDevice', 'claimDevice', 'removeDeviceOwned', 'listDevices', 'removeDevice',
  'addAudit', 'listAudit',
  'getHotlines', 'saveHotlines', 'saveSettingsWithAudit', 'acknowledgeReport',
  'getDemoConfig', 'listReportEffects', 'claimReportEffects', 'completeReportEffects',
  'reservePhotoAssets', 'recordPhotoAccepted', 'listDuePhotoAssets', 'claimPhotoAssetForCleanup', 'finishPhotoAssetCleanup',
  'summarizePhotoReconciliation', 'recipientPages', 'listMutationEffects', 'claimMutationEffects', 'completeMutationEffects',
];
