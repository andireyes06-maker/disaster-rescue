// CODEX-REPAIR-REVIEW R1 and R3 in the report form. A stateful fake server stores reports by Idempotency-Key and replays
// them. A "lost" response is an accepted commit followed by a network failure. Storage faults are injected explicitly.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const h = vi.hoisted(() => ({ api: vi.fn(), uid: 'uid-resolution' as string | null }));
vi.mock('../../api/client', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../api/client')>(), api: h.api,
}));
vi.mock('../../auth/AuthProvider', () => ({ useOptionalUid: () => h.uid }));

// These are retry-identity tests, not provider reads. Keep them deterministic and offline.
vi.mock('./useHotlines', () => ({useHotlines: () => ({numbers: [], residentNotice: ''})}));
vi.mock('./ReportLocationMap', () => ({default: () => null}));
import ReportForm from './ReportForm';

type Server = {
  byKey: Map<string, { id: string; description: string }>;
  reports: { id: string; description: string }[];
  posts: { key: string; description: string }[];
  lose: Set<string>;
  n: number;
};
const server: Server = { byKey: new Map(), reports: [], posts: [], lose: new Set(), n: 0 };
let denyWrites = false;

function giveGps() {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 14.6, longitude: 121.0 } }) },
  });
}

// Models the API contract: a key that already completed replays its report, and the reply marks the replay.
function serverAnswers(path: string, options: { formData?: FormData; headers?: Record<string, string>; onResponse?: (r: Response) => void }) {
  void path;
  const key = options.headers?.['Idempotency-Key'] ?? '';
  const description = String(options.formData?.get('description') ?? '');
  server.posts.push({ key, description });
  let report = server.byKey.get(key);
  const replayed = Boolean(report);
  if (!report) {
    report = { id: `r${++server.n}`, description };
    server.byKey.set(key, report);
    server.reports.push(report);
  }
  if (server.lose.has(description)) {
    return Promise.reject({ status: 0, code: 'network', message: 'lost reply (injected)' });
  }
  options.onResponse?.({ headers: new Headers(replayed ? { 'Idempotent-Replayed': '1' } : {}) } as Response);
  return Promise.resolve({ id: report.id, status: 'Submitted', reference: `DR-${report.id.toUpperCase()}` });
}

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/my/report']}>
      <Routes>
        <Route path="/my/report" element={<ReportForm />} />
        <Route path="/my/reports/:id" element={<p>report detail</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fill(user: ReturnType<typeof userEvent.setup>, description: string) {
  await user.click(screen.getByRole('radio', { name: 'Flood' }));
  const box = screen.getByLabelText('What is happening?');
  await user.clear(box);
  await user.type(box, description);
  await user.click(screen.getByRole('button', { name: 'Use my location' }));
}

const countFor = (description: string) => server.reports.filter((r) => r.description === description).length;

describe('report form resolution (CODEX-REPAIR-REVIEW R1 and R3)', () => {
  beforeEach(() => {
    h.api.mockReset().mockImplementation(serverAnswers);
    h.uid = 'uid-resolution';
    sessionStorage.clear();
    server.byKey.clear(); server.reports.length = 0; server.posts.length = 0; server.lose.clear(); server.n = 0;
    denyWrites = false;
    const realSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (denyWrites) throw new Error('[injected] storage write denied');
      realSetItem.call(this, k, v);
    });
    giveGps();
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('R1: five other unconfirmed versions do not change the original payload\'s key, and no duplicate report is made', async () => {
    const user = userEvent.setup({delay: null});
    const original = 'Version A: the original payload';
    server.lose.add(original);
    renderForm();
    await fill(user, original);
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    await waitFor(() => expect(server.posts).toHaveLength(1));
    const originalKey = server.posts[0].key;
    expect(countFor(original)).toBe(1); // the server accepted it; only the reply was lost

    for (let i = 1; i <= 4; i++) {
      const text = `Other unconfirmed version ${i}`;
      server.lose.add(text);
      await fill(user, text);
      await user.click(screen.getByRole('button', { name: 'Submit report' }));
      await waitFor(() => expect(server.posts).toHaveLength(i + 1));
    }

    // The sixth distinct version must not be sent under a new key that evicts the original.
    await fill(user, 'Other unconfirmed version 5');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(server.posts).toHaveLength(5);
    expect(await screen.findByText(/holds unconfirmed sends/i)).toBeInTheDocument();

    // Retrying the original payload reuses its key and receives the original report.
    server.lose.delete(original);
    await fill(user, original);
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    await waitFor(() => expect(server.posts).toHaveLength(6));
    expect(server.posts[5].key).toBe(originalKey);
    expect(countFor(original)).toBe(1);
  });

  it('R3: a confirmed send whose key could not be cleared is not silently replayed for a later deliberate send', async () => {
    const user = userEvent.setup({delay: null});
    const text = 'Report sent, then storage fails';
    const first = renderForm();
    await fill(user, text);
    // The server accepts the report. The tab then cannot clear its key, because storage writes are denied.
    h.api.mockImplementationOnce((path: string, options: Parameters<typeof serverAnswers>[1]) => {
      const result = serverAnswers(path, options);
      denyWrites = true;
      return result;
    });
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByText('report detail')).toBeInTheDocument();
    denyWrites = false;
    first.unmount();

    // A later, deliberate send of the same details is a new intention. The stale key replays the old report,
    // so the form must say so and wait for an explicit choice, rather than navigating silently.
    renderForm();
    await fill(user, text);
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByText(/already been received|already sent/i)).toBeInTheDocument();
    expect(screen.queryByText('report detail')).not.toBeInTheDocument();
    expect(countFor(text)).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Send as a new report' }));
    await waitFor(() => expect(countFor(text)).toBe(2));
    expect(await screen.findByText('report detail')).toBeInTheDocument();
  });

  it('R3: the explicit choice keeps focus on the message, and no report content is stored in tab storage', async () => {
    const user = userEvent.setup({delay: null});
    const text = 'Focus and privacy check';
    h.api.mockImplementationOnce((path: string, options: Parameters<typeof serverAnswers>[1]) => {
      const result = serverAnswers(path, options);
      denyWrites = true;
      return result;
    });
    const first = renderForm();
    await fill(user, text);
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    await screen.findByText('report detail');
    denyWrites = false;
    first.unmount();
    renderForm();
    await fill(user, text);
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    const notice = await screen.findByText(/already been received|already sent/i);
    await waitFor(() => expect(notice.closest('[data-replay-notice]')).toBeTruthy());
    expect(notice.closest('[data-replay-notice]')).toContainElement(document.activeElement as HTMLElement);
    const stored = Object.keys(sessionStorage).map((k) => `${k}=${sessionStorage.getItem(k)}`).join('\n');
    expect(stored).not.toContain('Focus and privacy check');
  });

  it('R3: when retry protection is kept only in memory, the form says so', async () => {
    const user = userEvent.setup({delay: null});
    denyWrites = true;
    renderForm();
    await fill(user, 'Memory only protection');
    server.lose.add('Memory only protection');
    await user.click(screen.getByRole('button', { name: 'Submit report' }));
    expect(await screen.findByText(/Retry protection is kept only for this page/i)).toBeInTheDocument();
  });
});
