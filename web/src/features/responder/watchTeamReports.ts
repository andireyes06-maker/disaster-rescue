import { onSnapshot, type DocumentData, type FirestoreError, type Query } from 'firebase/firestore';

interface WatchOptions<T> {
  keep: (row: T) => boolean;
  order: (a: T, b: T) => number;
  limit: number;
}

// Merge the legacy single-team and multi-team queries without disguising a partial result as a complete list.
export function watchTeamReports<T extends { id: string }>(
  queries: [Query<DocumentData>, Query<DocumentData>],
  convert: (id: string, data: DocumentData) => T,
  options: WatchOptions<T>,
  onRows: (rows: T[], fromCache: boolean, partialError: FirestoreError | null) => void,
  onError: (error: FirestoreError) => void,
): () => void {
  let active = true;
  const latest: [T[] | null, T[] | null] = [null, null];
  const cached = [false, false];
  const errors: (FirestoreError | null)[] = [null, null];
  const emit = () => {
    if (!active || !latest[0] || !latest[1]) return;
    const byId = new Map<string, T>();
    for (const row of [...latest[0], ...latest[1]]) byId.set(row.id, row);
    const rows = [...byId.values()].sort(options.order).slice(0, options.limit);
    onRows(rows, cached[0] || cached[1], errors.find(Boolean) ?? null);
    if (errors.every(Boolean)) onError(errors[0]!);
  };
  const unsubscribes = queries.map((q, i) => onSnapshot(q, { includeMetadataChanges: true },
    snap => {
      if (!active) return;
      latest[i] = snap.docs.map(d => convert(d.id, d.data())).filter(options.keep);
      cached[i] = snap.metadata.fromCache;
      errors[i] = null;
      emit();
    },
    error => {
      if (!active) return;
      errors[i] = error;
      latest[i] = [];
      cached[i] = false;
      // Surface the failure even while the other channel is still starting.
      if (!latest[1 - i]) onError(error);
      emit();
    },
  ));
  return () => { active = false; unsubscribes.forEach(unsubscribe => unsubscribe()); };
}
