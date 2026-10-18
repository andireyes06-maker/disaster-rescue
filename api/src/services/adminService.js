import { HttpError } from '../errors.js';
import { auditService } from './auditService.js';

const HOTLINE_MAX = 40;
const NOTICE_MAX = 500;

// The editable number is the one entry marked editable. Non-editable entries (such as 911) are kept as they are.
const editableEntry = (doc) => (doc.numbers ?? []).find((n) => n.editable);

export async function health({ repo }) {
  let firestore = 'ok';
  try { await repo.getHotlines(); } catch { firestore = 'error'; }
  return { api: 'ok', firestore, checkedAt: new Date().toISOString() };
}

export async function getSettings({ repo }) {
  const doc = await repo.getHotlines();
  return { hotline: editableEntry(doc)?.number ?? '', residentNotice: doc.residentNotice ?? '' };
}

export async function saveSettings({ repo }, actorUid, body = {}) {
  const hotline = typeof body.hotline === 'string' ? body.hotline.trim() : null;
  const residentNotice = typeof body.residentNotice === 'string' ? body.residentNotice.trim() : null;
  // Both fields are required, matching the settings form. Empty is refused, never stored as "unset".
  if (!hotline || hotline.length > HOTLINE_MAX) {
    throw new HttpError(400, 'validation_failed', `Hotline is required and at most ${HOTLINE_MAX} characters`);
  }
  if (!residentNotice || residentNotice.length > NOTICE_MAX) {
    throw new HttpError(400, 'validation_failed', `Resident notice is required and at most ${NOTICE_MAX} characters`);
  }
  const doc = await repo.getHotlines();
  const before = await getSettings({ repo });
  const numbers = (doc.numbers ?? []).filter((n) => !n.editable);
  numbers.push({ label: editableEntry(doc)?.label ?? 'LDRRMO', number: hotline, editable: true });
  await repo.saveHotlines({ ...doc, numbers, residentNotice });
  const after = { hotline, residentNotice };
  await auditService.record(repo, { actorUid, action: 'settings.update', before, after });
  return after;
}
