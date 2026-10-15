import { randomInt } from 'node:crypto';
import { parseReportInput, validatePhotos } from '../domain/validation.js';
import { coarsen } from '../domain/privacy.js';
import { findPossibleDuplicates } from '../domain/duplicates.js';
import { STATUS } from '../domain/workflow.js';
import { record } from './auditService.js';

export function makeReference() {
  let s = '';
  for (let i = 0; i < 6; i++) s += randomInt(36).toString(36).toUpperCase();
  return `DR-${s}`;
}

export async function create({ repo, uploader, notifier }, user, input, files) {
  // Validate everything before any side effect.
  const data = parseReportInput(input);
  validatePhotos(files);

  const reference = makeReference();
  const now = new Date();
  const location = { lat: data.lat, lng: data.lng, source: data.source };
  const report = {
    reference,
    type: data.type,
    description: data.description,
    status: STATUS.SUBMITTED,
    verified: false,
    priority: 'medium',
    location,
    coarseLocation: coarsen(data.lat, data.lng),
    reporterId: user.uid,
    photos: [],
    createdAt: now,
  };
  if (data.addressText) report.addressText = data.addressText;
  if (data.contact) report.contact = data.contact;

  // Read before uploading so a failure here leaves no orphaned assets.
  const open = await repo.listOpenReports();
  report.possibleDuplicates = findPossibleDuplicates(report, open);

  const uploaded = files?.length ? await uploader.upload(files) : [];
  // publicId is internal (for cleanup) and never stored on the report.
  report.photos = uploaded.map(({ publicId, ...photo }) => photo);

  let id;
  try {
    id = await repo.createReport(report);
  } catch (e) {
    if (uploaded.length) {
      try { await uploader.remove(uploaded); } catch (re) { console.error('photo cleanup failed', re); }
    }
    throw e;
  }

  // The report exists now: audit and notify failures must not fail the request.
  try {
    await record(repo, { actorUid: user.uid, action: 'report.create', reportId: id, after: { status: report.status, type: report.type, reference } });
  } catch (e) {
    console.error('audit write failed', e);
  }
  try {
    await notifier?.notifyRole?.('dispatcher', {
      title: 'New report',
      body: `${report.type} report ${reference} submitted`,
      reportId: id,
    });
  } catch (e) {
    console.error('notify failed', e);
  }
  return { id, status: report.status, reference };
}

export const reportService = { create };
