import { useState, type ReactNode } from 'react';

// Notes longer than this show a shortened preview. The full text stays in the page behind a disclosure.
const NOTE_PREVIEW_LENGTH = 280;

// Renders one note. Short notes are shown as they are. Long notes get a preview and a "Show full note" disclosure.
export function ActivityNote({ text }: { text: string }) {
  if (text.length <= NOTE_PREVIEW_LENGTH) return <p className="plain">{text}</p>;
  return (
    <div className="activity-note">
      <p className="plain activity-note__preview">{text.slice(0, NOTE_PREVIEW_LENGTH).trimEnd()}…</p>
      <details>
        <summary>Show full note</summary>
        <p className="plain">{text}</p>
      </details>
    </div>
  );
}

interface ActivityHistoryProps<T extends { id: string; note?: string }> {
  // Oldest first, as the updates listener delivers them.
  updates: T[];
  renderItem: (update: T) => ReactNode;
  recentCount?: number;
  listClassName?: string;
  // True when the listener has more history beyond the updates passed in. Shows a control to fetch it.
  hasMore?: boolean;
  onLoadOlder?: () => void;
  scrollable?: boolean;
}

// Shows the newest updates first. Older updates sit behind a button and appear above the recent block, oldest first.
export default function ActivityHistory<T extends { id: string; note?: string }>({
  updates,
  renderItem,
  recentCount = 5,
  listClassName = 'updates',
  hasMore = false,
  onLoadOlder,
  scrollable = false,
}: ActivityHistoryProps<T>) {
  const [showOlder, setShowOlder] = useState(false);
  const splitAt = Math.max(0, updates.length - recentCount);
  const older = updates.slice(0, splitAt);
  const recent = updates.slice(splitAt).reverse();
  const visible = showOlder ? [...older, ...recent] : recent;
  const olderLabel = older.length === 1 ? 'Show 1 older update' : `Show ${older.length} older updates`;

  return (
    <>
      {older.length > 0 && (
        <button type="button" className="btn btn--ghost" aria-expanded={showOlder}
          onClick={() => setShowOlder((open) => !open)}>
          {showOlder ? 'Hide older updates' : olderLabel}
        </button>
      )}
      <ol className={listClassName} tabIndex={scrollable ? 0 : undefined} aria-label={scrollable ? 'Rescue update history' : undefined}>
        {visible.map((u) => <li key={u.id}>{renderItem(u)}</li>)}
      </ol>
      {hasMore && onLoadOlder && (
        <button type="button" className="btn btn--ghost" onClick={onLoadOlder}>Load older updates</button>
      )}
    </>
  );
}
