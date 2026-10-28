// Synthetic demo scenario. Every record here is fictional sample data.
// Built from one clock (DEMO_NOW) so the same input always yields the same records.
// Stored shapes follow api/src/services/* and api/src/adapters/firestoreRepo.js.
import { coarsen } from '../api/src/domain/privacy.js';

export const DEFAULT_NOW = '2026-10-17T08:00:00+08:00';
export const SAMPLE_LABEL = 'Harbor Response Network';
export const DEMO_PHOTO_PREFIX = 'demo-evidence/';

const HOUR = 3600 * 1000;
// Each sample zone sits in a real Bulacan town, so the analytics location chart shows a spread. [lat, lng, town].
const ZONE = {
  Riverside: [14.8333, 120.8833, 'Guiguinto'],
  Market: [14.8433, 120.8114, 'Malolos'],
  Hillside: [14.7936, 120.8794, 'Bulakan'],
  Central: [14.815, 120.9097, 'Balagtas'],
  Civic: [14.7986, 120.9261, 'Bocaue'],
  Riverbend: [14.7581, 120.9553, 'Marilao'],
  Warehouse: [14.737, 120.9608, 'Meycauayan'],
  South: [14.8858, 120.8556, 'Plaridel'],
};
const TEAM_NAMES = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima'];
const TEAM_RESPONDER = { alpha: 'demo-responder-a', bravo: 'demo-responder-b', delta: 'demo-responder-d', foxtrot: 'demo-responder-f' };

// Accounts. uid equals the stable id, so repeated seeds reuse the same Auth user.
export const ACCOUNTS = [
  { uid: 'demo-admin', email: 'elena.cruz@harbor.example', name: 'Elena Cruz', role: 'admin', phone: '+1 (555) 010-0100' },
  { uid: 'demo-dispatcher-a', email: 'marco.reyes@harbor.example', name: 'Marco Reyes', role: 'dispatcher', phone: '+1 (555) 010-0101' },
  { uid: 'demo-dispatcher-b', email: 'sofia.lim@harbor.example', name: 'Sofia Lim', role: 'dispatcher', phone: '+1 (555) 010-0102' },
  { uid: 'demo-dmo', email: 'adrian.santos@harbor.example', name: 'Adrian Santos', role: 'dmo', phone: '+1 (555) 010-0103' },
  { uid: 'demo-resident-a', email: 'maya.torres@harbor.example', name: 'Maya Torres', role: 'resident', phone: '+1 (555) 010-0111' },
  { uid: 'demo-resident-b', email: 'noah.garcia@harbor.example', name: 'Noah Garcia', role: 'resident', phone: '+1 (555) 010-0112' },
  { uid: 'demo-resident-c', email: 'isabel.ramos@harbor.example', name: 'Isabel Ramos', role: 'resident', phone: '+1 (555) 010-0113' },
  { uid: 'demo-resident-d', email: 'leo.mendoza@harbor.example', name: 'Leo Mendoza', role: 'resident', phone: '+1 (555) 010-0114' },
  { uid: 'demo-responder-a', email: 'daniel.flores@harbor.example', name: 'Daniel Flores', role: 'responder', team: 'demo-team-alpha', phone: '+1 (555) 010-0121' },
  { uid: 'demo-responder-b', email: 'clara.navarro@harbor.example', name: 'Clara Navarro', role: 'responder', team: 'demo-team-bravo', phone: '+1 (555) 010-0122' },
  { uid: 'demo-responder-d', email: 'rafael.castillo@harbor.example', name: 'Rafael Castillo', role: 'responder', team: 'demo-team-delta', phone: '+1 (555) 010-0123' },
  { uid: 'demo-responder-f', email: 'nina.bautista@harbor.example', name: 'Nina Bautista', role: 'responder', team: 'demo-team-foxtrot', phone: '+1 (555) 010-0124' },
];
const RESIDENT_UID = { a: 'demo-resident-a', b: 'demo-resident-b', c: 'demo-resident-c', d: 'demo-resident-d' };
const DISPATCHER_UID = 'demo-dispatcher-a';
const RELAY_UID = 'demo-dispatcher-b';

// Report table. ageH = hours before DEMO_NOW. Event `h` = hours after creation.
// Dispatcher events are logged as audit entries. Responder events are logged as updates.
const REPORTS = [
  { n: '01', type: 'flood', priority: 'critical', zone: 'Riverside', owner: 'a', ageH: 2, photos: 3, status: 'Submitted',
    text: 'Water has entered the ground floor. Three residents need help reaching higher ground.', events: [] },
  { n: '02', type: 'fire', priority: 'high', zone: 'Market', owner: 'b', ageH: 5, photos: 1, status: 'Submitted',
    text: 'Smoke is coming from a storage area. Residents have moved to an open space.', events: [] },
  { n: '03', type: 'landslide', priority: 'high', zone: 'Hillside', owner: 'b', ageH: 9, photos: 1, status: 'Submitted',
    text: 'Soil and branches are blocking an access road after heavy rain.', events: [] },
  { n: '04', type: 'other', priority: 'medium', zone: 'Central', owner: 'b', ageH: 14, photos: 0, status: 'Submitted',
    text: 'A fallen tree blocks the entrance to a residential lane.', events: [] },
  { n: '05', type: 'flood', priority: 'critical', zone: 'Riverside', owner: 'a', ageH: 26, photos: 1, status: 'Under Verification',
    text: 'A household reports rapidly rising water and an older resident who needs assistance.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }] },
  { n: '06', type: 'earthquake', priority: 'high', zone: 'Civic', owner: 'b', ageH: 31, photos: 1, status: 'Under Verification',
    text: 'Cracks and fallen ceiling panels have been reported near a meeting area.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }] },
  { n: '07', type: 'flood', priority: 'critical', zone: 'Riverbend', owner: 'b', ageH: 40, photos: 2, status: 'Verified',
    text: 'Four residents are waiting on an upper floor. The location has been confirmed.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }] },
  { n: '08', type: 'other', priority: 'low', zone: 'Central', owner: 'b', ageH: 52, photos: 0, status: 'Verified',
    text: 'Debris partly blocks a walkway. No trapped residents have been reported.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }] },
  { n: '09', type: 'fire', priority: 'critical', zone: 'Warehouse', owner: 'a', ageH: 60, photos: 0, status: 'Awaiting Assignment',
    text: 'A fire report has been verified. Nearby residents are waiting in an open area.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }] },
  { n: '10', type: 'landslide', priority: 'high', zone: 'Hillside', owner: 'c', ageH: 75, photos: 1, status: 'Awaiting Assignment',
    text: 'Road access is blocked. A team is needed to assess a safe approach.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }] },
  { n: '11', type: 'flood', priority: 'medium', zone: 'South', owner: 'c', ageH: 90, photos: 0, status: 'Awaiting Assignment',
    text: 'Two households need assistance moving to the designated meeting point.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 3, to: 'Awaiting Assignment', by: 'dispatcher' }] },
  { n: '12', type: 'flood', priority: 'critical', zone: 'Riverside', owner: 'a', ageH: 110, photos: 2, status: 'Team Assigned', team: 'alpha', ack: true,
    text: 'A family is waiting for assistance near the footbridge approach.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }, { h: 3, to: 'Team Assigned', by: 'dispatcher', team: 'alpha' }, { h: 3.5, ack: true, by: 'responder' }] },
  { n: '13', type: 'fire', priority: 'high', zone: 'Market', owner: 'c', ageH: 130, photos: 2, status: 'Team Assigned', team: 'bravo', ack: true,
    text: 'The assigned team is preparing to assess the reported smoke.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }, { h: 3, to: 'Team Assigned', by: 'dispatcher', team: 'bravo' }, { h: 3.5, ack: true, by: 'responder' }] },
  { n: '14', type: 'earthquake', priority: 'high', zone: 'Civic', owner: 'c', ageH: 150, photos: 2, status: 'Team Assigned', team: 'charlie',
    text: 'A team has been assigned to assess reported structural damage.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }, { h: 3, to: 'Team Assigned', by: 'dispatcher', team: 'charlie' }] },
  { n: '15', type: 'flood', priority: 'critical', zone: 'Riverbend', owner: 'a', ageH: 170, photos: 3, status: 'Rescue in Progress', team: 'delta', ack: true,
    text: 'Responders have reached the area and are helping residents leave safely.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }, { h: 3, to: 'Team Assigned', by: 'dispatcher', team: 'delta' }, { h: 3.5, ack: true, by: 'responder' },
      { h: 4, to: 'Rescue in Progress', by: 'responder', note: 'Team reached the access point', rescued: 2 }, { h: 6, to: 'Rescue in Progress', by: 'responder', note: 'Two residents assisted to the meeting point', rescued: 3 }] },
  { n: '16', type: 'landslide', priority: 'high', zone: 'Hillside', owner: 'c', ageH: 200, photos: 1, status: 'Rescue in Progress', team: 'echo',
    text: 'The team is assisting residents around the blocked access road.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }, { h: 3, to: 'Team Assigned', by: 'dispatcher', team: 'echo' },
      { h: 4, to: 'Rescue in Progress', by: 'relay', note: 'Team Echo reached the blocked access road', rescued: 1 }] },
  { n: '17', type: 'other', priority: 'medium', zone: 'Central', owner: 'c', ageH: 230, photos: 0, status: 'Rescue in Progress', team: 'foxtrot', ack: true,
    text: 'Responders are assisting a household affected by fallen debris.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }, { h: 3, to: 'Team Assigned', by: 'dispatcher', team: 'foxtrot' }, { h: 3.5, ack: true, by: 'responder' },
      { h: 4, to: 'Rescue in Progress', by: 'responder', note: 'Debris cleared from the household entrance', rescued: 1 }] },
  { n: '18', type: 'flood', priority: 'medium', zone: 'South', owner: 'a', ageH: 260, photos: 1, status: 'Resolved', team: 'golf',
    text: 'The reported residents have reached the meeting point. Staff closure is pending.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }, { h: 3, to: 'Team Assigned', by: 'dispatcher', team: 'golf' },
      { h: 4, to: 'Rescue in Progress', by: 'relay', note: 'Team Golf reached the access point' }, { h: 8, to: 'Resolved', by: 'relay', note: 'Residents reached the meeting point', rescued: 4 }] },
  { n: '19', type: 'fire', priority: 'high', zone: 'Warehouse', owner: 'd', ageH: 290, photos: 1, status: 'Resolved', team: 'hotel',
    text: 'The assigned team has completed the requested assistance. Staff closure is pending.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }, { h: 3, to: 'Team Assigned', by: 'dispatcher', team: 'hotel' },
      { h: 4, to: 'Rescue in Progress', by: 'relay', note: 'Team Hotel started assistance at the warehouse' }, { h: 9, to: 'Resolved', by: 'relay', note: 'Requested assistance completed', rescued: 2 }] },
  { n: '20', type: 'earthquake', priority: 'medium', zone: 'Civic', owner: 'd', ageH: 300, photos: 1, status: 'Closed', team: 'india',
    text: 'The response has been completed and the report reviewed and closed.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }, { h: 3, to: 'Team Assigned', by: 'dispatcher', team: 'india' },
      { h: 4, to: 'Rescue in Progress', by: 'relay', note: 'Team India assessed the building', rescued: 3 }, { h: 7, to: 'Resolved', by: 'relay', note: 'Assessment complete' }, { h: 30, to: 'Closed', by: 'dispatcher', close: true }] },
  { n: '21', type: 'flood', priority: 'low', zone: 'Riverside', owner: 'd', ageH: 330, photos: 1, status: 'Closed', team: 'juliet',
    text: 'The response is complete. Staff have reviewed the final update.',
    events: [{ h: 1, to: 'Under Verification', by: 'dispatcher' }, { h: 2, to: 'Verified', by: 'dispatcher', verify: true }, { h: 2.5, to: 'Awaiting Assignment', by: 'dispatcher' }, { h: 3, to: 'Team Assigned', by: 'dispatcher', team: 'juliet' },
      { h: 4, to: 'Rescue in Progress', by: 'relay', note: 'Team Juliet helped residents leave the lower floor', rescued: 2 }, { h: 7, to: 'Resolved', by: 'relay', note: 'Residents safe' }, { h: 40, to: 'Closed', by: 'dispatcher', close: true }] },
  { n: '22', type: 'other', priority: 'low', zone: 'Central', owner: 'd', ageH: 180, photos: 0, status: 'Rejected',
    text: 'A submitted report was rejected after its location could not be confirmed.',
    events: [{ h: 1, to: 'Rejected', by: 'dispatcher' }] },
  { n: '23', type: 'flood', priority: 'medium', zone: 'Riverbend', owner: 'd', ageH: 166, photos: 1, status: 'Duplicate', duplicateOf: '15',
    text: 'This report describes the same incident as RR-260015.',
    events: [{ h: 0.5, to: 'Duplicate', by: 'dispatcher', dup: '15' }] },
  { n: '24', type: 'other', priority: 'low', zone: 'South', owner: 'd', ageH: 120, photos: 0, status: 'Cancelled',
    text: 'The resident cancelled the report before verification.',
    events: [{ h: 0.2, to: 'Cancelled', by: 'resident' }] },
];

const TEAMS = TEAM_NAMES.map((name, i) => ({ key: name.toLowerCase(), name: `Harbor ${name}`, id: `demo-team-${name.toLowerCase()}`, index: i }));

const pad = (n) => String(n).padStart(2, '0');
const jitter = (n, scale) => ((Number(n) * 37) % 11 - 5) * scale;

function locationFor(r) {
  if (r.n === '23') {
    const base = locationFor(REPORTS.find((x) => x.n === '15'));
    return { lat: base.lat + 0.0001, lng: base.lng + 0.0001, source: 'manual' };
  }
  const [lat, lng] = ZONE[r.zone];
  return {
    lat: Number((lat + jitter(r.n, 0.0003)).toFixed(6)),
    lng: Number((lng + jitter(r.n, 0.0003)).toFixed(6)),
    source: 'manual',
  };
}

function photosFor(r) {
  const count = r.photos;
  return Array.from({ length: count }, (_, i) => ({
    url: `${DEMO_PHOTO_PREFIX}sample-${String(((Number(r.n) + i) % 6) + 1).padStart(2, '0')}.png`,
    sizeBytes: 48000 + i * 1000,
    mimeType: 'image/png',
  }));
}

export function buildScenario({ now = DEFAULT_NOW } = {}) {
  const nowMs = new Date(now).getTime();
  const at = (ms) => new Date(ms);
  const teams = TEAMS.map((t) => ({ id: t.id, name: t.name, members: [], busy: false, currentReportId: null }));
  const reports = [];
  const updates = [];
  const audit = [];
  const notifications = [];

  for (const r of REPORTS) {
    const id = `demo-report-${r.n}`;
    const createdMs = nowMs - r.ageH * HOUR;
    const created = at(createdMs);
    const location = locationFor(r);
    const ownerUid = RESIDENT_UID[r.owner];
    const doc = {
      id,
      reference: `RR-2600${r.n}`,
      type: r.type,
      description: r.text,
      status: 'Submitted',
      verified: false,
      priority: r.priority,
      location,
      coarseLocation: coarsen(location.lat, location.lng),
      reporterId: ownerUid,
      photos: photosFor(r),
      addressText: `${r.zone} District`,
      locality: ZONE[r.zone][2],
      createdAt: created,
      updatedAt: created,
    };
    let prev = 'Submitted';
    let u = 0;
    let a = 0;
    let k = 0;
    let lastMs = createdMs;
    const addAudit = (actorUid, action, when, extra = {}) => {
      audit.push({ id: `demo-audit-${r.n}-${pad(++a)}`, actorUid, action, reportId: id, at: at(when), ...extra });
    };
    const addNote = (recipientUid, title, body, when) => {
      if (!recipientUid) return;
      notifications.push({ id: `demo-notif-${r.n}-${pad(++k)}`, recipientUid, title, body, reportId: id, read: false, createdAt: at(when) });
    };
    addAudit(ownerUid, 'report.create', createdMs + 0.05 * HOUR, { after: { status: 'Submitted', type: r.type, reference: doc.reference } });
    addNote(ownerUid, 'Report received', `${doc.reference} was received`, createdMs + 0.05 * HOUR);

    for (const ev of r.events) {
      const when = createdMs + ev.h * HOUR;
      lastMs = Math.max(lastMs, when);
      if (ev.ack) {
        const uid = teamResponder(r.team);
        const actor = uid ?? RELAY_UID;
        updates.push({ id: `demo-update-${r.n}-${pad(++u)}`, reportId: id, kind: 'acknowledge', byUid: actor, at: at(when) });
        addAudit(actor, 'report.acknowledge', when, { after: { status: prev } });
        continue;
      }
      if (ev.team) {
        doc.assignedTeamId = `demo-team-${ev.team}`;
        doc.assignedAt = at(when);
        addAudit(DISPATCHER_UID, 'report.assign', when, { after: { status: 'Team Assigned', assignedTeamId: doc.assignedTeamId } });
        const responder = teamResponder(ev.team);
        addNote(doc.reporterId, 'Team assigned', `${doc.reference} has been assigned to a rescue team`, when);
        addNote(responder, 'New assignment', `${doc.reference} assigned to Harbor ${cap(ev.team)}`, when);
      }
      if (ev.close) {
        // Closing releases the team, matching assignmentService.close.
        addAudit(DISPATCHER_UID, 'report.close', when, { after: { status: 'Closed' } });
      }
      if (ev.dup) addAudit(DISPATCHER_UID, 'report.duplicate', when, { after: { status: 'Duplicate', duplicateOf: `demo-report-${ev.dup}` } });
      if (ev.verify) addAudit(DISPATCHER_UID, 'report.verify', when, { after: { status: ev.to, verified: true } });

      const by = ev.by === 'relay' ? RELAY_UID : ev.by === 'responder' ? teamResponder(r.team) ?? RELAY_UID : ev.by === 'resident' ? ownerUid : DISPATCHER_UID;
      const responderStep = ev.by === 'responder' || ev.by === 'relay';
      if (responderStep && ev.to !== prev) {
        updates.push({ id: `demo-update-${r.n}-${pad(++u)}`, reportId: id, kind: 'status', status: ev.to, note: ev.note ?? '', peopleRescued: ev.rescued ?? 0, byUid: by, at: at(when) });
      } else if (responderStep && ev.rescued) {
        updates.push({ id: `demo-update-${r.n}-${pad(++u)}`, reportId: id, kind: 'status', status: ev.to, note: ev.note ?? '', peopleRescued: ev.rescued, byUid: by, at: at(when) });
      }
      // Duplicate has its own audit action above; every other transition logs a status change.
      if (ev.to !== prev && !ev.dup) {
        addAudit(by, 'status.change', when, { before: { status: prev }, after: { status: ev.to } });
      }
      prev = ev.to;
      doc.status = ev.to;
      if (ev.to === 'Verified') addNote(doc.reporterId, 'Report verified', `${doc.reference} was verified`, when);
      if (ev.to === 'Rescue in Progress' && responderStep) addNote(doc.reporterId, 'Response update', `${doc.reference} has a response update`, when);
      if (ev.to === 'Resolved') addNote(doc.reporterId, 'Report resolved', `${doc.reference} was resolved`, when);
      if (ev.to === 'Rejected') addNote(doc.reporterId, 'Report update', `${doc.reference} was not accepted for response`, when);
    }
    doc.verified = ['Verified', 'Awaiting Assignment', 'Team Assigned', 'Rescue in Progress', 'Resolved', 'Closed'].includes(doc.status);
    doc.updatedAt = at(lastMs);
    if (r.duplicateOf) doc.duplicateOf = `demo-report-${r.duplicateOf}`;
    reports.push(doc);

    // Team state follows the report's active assignment (only reports holding a team).
    const team = teams.find((t) => t.id === doc.assignedTeamId);
    if (team && !['Closed', 'Rejected', 'Duplicate', 'Cancelled'].includes(doc.status)) {
      team.busy = true;
      team.currentReportId = id;
    }
  }

  // Responder accounts are members of their team. Teams without accounts stay memberless.
  for (const [teamKey, uid] of Object.entries(TEAM_RESPONDER)) {
    const team = teams.find((t) => t.id === `demo-team-${teamKey}`);
    team.members = [uid];
  }

  return { now: at(nowMs), accounts: ACCOUNTS, teams, reports, updates, audit, notifications };
}

function teamResponder(teamKey) {
  return teamKey ? TEAM_RESPONDER[teamKey] ?? null : null;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const CONFIG_DEMO = (now, scenario = 'default') => ({
  active: true,
  scenario,
  label: SAMPLE_LABEL,
  scenarioNow: new Date(now).toISOString(),
});

// Opt-in QA set (`--scenario qa`): stress cases that the polished default set avoids.
// Long text at the 1000-character limit, a formula-like description, and a report with no photos or address.
export function buildQaScenario({ now = DEFAULT_NOW } = {}) {
  const nowMs = new Date(now).getTime();
  const created = (h) => new Date(nowMs - h * HOUR);
  const longText = 'Long text check. '.repeat(60).slice(0, 1000);
  const reports = [
    {
      id: 'demo-qa-report-01', reference: 'DR-DEMOQA1', type: 'flood', priority: 'high', status: 'Submitted', verified: false,
      description: longText, location: { lat: 14.8333, lng: 120.8833, source: 'manual' }, coarseLocation: coarsen(14.8333, 120.8833),
      reporterId: 'demo-resident-a', photos: [{ url: `${DEMO_PHOTO_PREFIX}sample-01.png`, sizeBytes: 48000, mimeType: 'image/png' }],
      addressText: 'QA long text sample area', locality: 'Guiguinto', createdAt: created(3), updatedAt: created(3),
    },
    {
      id: 'demo-qa-report-02', reference: 'DR-DEMOQA2', type: 'other', priority: 'low', status: 'Verified', verified: true,
      description: '=HYPERLINK("https://example.test","formula-like text in a demo description")', location: { lat: 14.8433, lng: 120.8114, source: 'manual' },
      coarseLocation: coarsen(14.8433, 120.8114), reporterId: 'demo-resident-b', photos: [], addressText: 'QA formula sample area', locality: 'Malolos',
      createdAt: created(20), updatedAt: created(19),
    },
    {
      id: 'demo-qa-report-03', reference: 'DR-DEMOQA3', type: 'fire', priority: 'medium', status: 'Submitted', verified: false,
      description: 'No photos and no address text on this sample report.', location: { lat: 14.8858, lng: 120.8556, source: 'manual' },
      coarseLocation: coarsen(14.8858, 120.8556), locality: 'Plaridel', reporterId: 'demo-resident-c', photos: [], createdAt: created(40), updatedAt: created(40),
    },
  ];
  return { now: new Date(nowMs), accounts: ACCOUNTS, teams: [], reports, updates: [], audit: [], notifications: [] };
}

// Expected counts, asserted by tests. Derived from the scenario, never pasted into screens.
export const EXPECTED = Object.freeze({
  total: 24,
  active: 17,
  activeCritical: 6,
  verified: 15,
  needsVerification: 6,
  byType: { flood: 9, fire: 4, earthquake: 3, landslide: 3, other: 5 },
  byStatus: {
    Submitted: 4, 'Under Verification': 2, Verified: 2, 'Awaiting Assignment': 3, 'Team Assigned': 3,
    'Rescue in Progress': 3, Resolved: 2, Closed: 2, Rejected: 1, Duplicate: 1, Cancelled: 1,
  },
  busyTeams: 8,
  availableTeams: 4,
  peopleRescued: 18,
});
