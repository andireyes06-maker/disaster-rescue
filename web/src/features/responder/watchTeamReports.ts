import { onSnapshot, type DocumentData, type FirestoreError, type Query } from 'firebase/firestore';

interface WatchOptions<T> {
  /** Keeps only the rows this list should show. */
  keep: (row: T) => boolean;
  /** Orders the joined rows. */
  order: (a: T, b: T) => number;
  limit: number;
}

// Two live queries for one team, joined: reports naming the team in assignedTeamId (older reports) and reports listing
// it in assignedTeamIds (reports assigned to several teams). A report matched by both is shown once.
export function watchTeamReports<T extends { id: string }>(
  queries: [Query<DocumentData>, Query<DocumentData>],
  convert: (id: string, data: DocumentData) => T,
  options: WatchOptions<T>,
  onRows: (rows: T[], fromCache: boolean) => void,
  onError: (error: FirestoreError) => void,
): () => void {
  const latest: [T[] | null, T[] | null] = [null, null];
  const cached: [boolean, boolean] = [false, false];
  const emit = () => {
    const [a, b] = latest;
    if (!a || !b) return;
    const byId = new Map<string, T>();
    for (const row of [...a, ...b]) byId.set(row.id, row);
    const rows = [...byId.values()].sort(options.order).slice(0, options.limit);
    onRows(rows, cached[0] || cached[1]);
  };
  const unsubscribes = queries.map((q, i) => onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => {
      latest[i] = snap.docs.map((d) => convert(d.id, d.data())).filter(options.keep);
      cached[i] = snap.metadata.fromCache;
      emit();
    },
    // The several-teams query (index 1) can fail before its index is deployed. Its failure must not hide the single-team reports.
    (error) => {
      if (i === 1) {
        latest[1] = [];
        cached[1] = false;
        emit();
      } else {
        onError(error);
      }
    },
  ));
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}
