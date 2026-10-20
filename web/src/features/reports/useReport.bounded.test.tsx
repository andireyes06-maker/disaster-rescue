import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

interface Sub {
  q: { ref: string; constraints: Array<Record<string, unknown>> };
  ok: (s: { docs: unknown[] }) => void;
  unsub: () => void;
}

const h = vi.hoisted(() => ({ subs: [] as Sub[] }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: unknown, c: string, id: string, sub: string) => ({ ref: `${c}/${id}/${sub}`, constraints: [] })),
  orderBy: vi.fn((field: string, dir: string) => ({ orderBy: field, dir })),
  limit: vi.fn((n: number) => ({ limit: n })),
  query: vi.fn((ref: { ref: string }, ...constraints: Array<Record<string, unknown>>) => ({ ref: ref.ref, constraints })),
  onSnapshot: vi.fn((q: Sub['q'], ok: Sub['ok']) => {
    const sub = { q, ok, unsub: vi.fn() } as Sub;
    h.subs.push(sub);
    return sub.unsub;
  }),
}));
vi.mock('../../firebase', () => ({ getFirebaseDb: () => ({}) }));

import { useReportUpdates } from './useReport';
import ActivityHistory, { ActivityNote } from '../../components/calm/ActivityHistory';

const ts = (ms: number) => ({ toDate: () => new Date(ms) });
const TOTAL = 50;
// A 50-update history, newest first, as the server would store it under orderBy('at', 'desc').
const fullHistoryNewestFirst = (note: (i: number) => string) =>
  Array.from({ length: TOTAL }, (_, k) => {
    const i = TOTAL - 1 - k;
    return { id: `u${i}`, data: () => ({ kind: 'status', status: `Update ${i}`, note: note(i), at: ts(i * 1000) }) };
  });

// Plays the server for the latest subscription: honours its limit and returns the newest docs first.
function serveLatest(note: (i: number) => string) {
  const sub = h.subs.at(-1)!;
  const limit = sub.q.constraints.find((c) => 'limit' in c)?.limit as number | undefined;
  const docs = fullHistoryNewestFirst(note).slice(0, limit ?? TOTAL);
  act(() => sub.ok({ docs }));
}

function Harness({ note }: { note: (i: number) => string }) {
  const updates = useReportUpdates('r1');
  return (
    <ActivityHistory
      updates={updates.updates}
      hasMore={updates.hasMore}
      onLoadOlder={updates.loadOlder}
      renderItem={(u) => (
        <>
          <strong>{u.status}</strong>
          {u.note && <ActivityNote text={u.note} />}
        </>
      )}
    />
  );
}

const plainNote = (i: number) => `Note ${i}`;
const longNote = (i: number) => `Note ${i} ` + 'y'.repeat(400) + ` tail-${i}`;

function renderedLabels(): string[] {
  const list = screen.getByRole('list');
  return within(list).getAllByRole('listitem').map((li) => li.querySelector('strong')?.textContent ?? '');
}

describe('useReportUpdates bounded window with ActivityHistory', () => {
  beforeEach(() => { h.subs.length = 0; });

  it('shows 5 of a 50-update history by default and offers Load older while more exists', () => {
    render(<Harness note={plainNote} />);
    serveLatest(plainNote);
    expect(h.subs.at(-1)!.q.constraints).toEqual(expect.arrayContaining([{ orderBy: 'at', dir: 'desc' }, { limit: 20 }]));
    expect(renderedLabels()).toEqual(['Update 49', 'Update 48', 'Update 47', 'Update 46', 'Update 45']);
    expect(screen.getByRole('button', { name: 'Show 15 older updates' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load older updates' })).toBeInTheDocument();
  });

  it('Load older widens the window to 40 and keeps every note exact', async () => {
    render(<Harness note={longNote} />);
    serveLatest(longNote);
    await userEvent.click(screen.getByRole('button', { name: 'Load older updates' }));
    expect(h.subs.at(-1)!.q.constraints).toEqual(expect.arrayContaining([{ limit: 40 }]));
    serveLatest(longNote);
    await userEvent.click(screen.getByRole('button', { name: 'Show 35 older updates' }));
    expect(renderedLabels()).toHaveLength(40);
    for (let i = 10; i < TOTAL; i++) expect(screen.getByText(longNote(i))).toBeInTheDocument();
  });

  it('hides Load older once the window reaches the end of the history', async () => {
    render(<Harness note={plainNote} />);
    serveLatest(plainNote);
    await userEvent.click(screen.getByRole('button', { name: 'Load older updates' }));
    serveLatest(plainNote);
    await userEvent.click(screen.getByRole('button', { name: 'Load older updates' }));
    serveLatest(plainNote);
    expect(screen.queryByRole('button', { name: 'Load older updates' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show 45 older updates' })).toBeInTheDocument();
  });
});
