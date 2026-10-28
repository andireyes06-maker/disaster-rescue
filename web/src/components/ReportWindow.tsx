export default function ReportWindow({count, windowSize, loadMore, order = 'newest'}: {count: number; windowSize?: number; loadMore?: () => void; order?: 'newest' | 'oldest'}) {
  if (!windowSize || (windowSize === 50 && count < windowSize)) return null;
  const hasMore = count >= windowSize;
  return <div className="report-window"><p>{hasMore ? `Showing ${count} ${order} reports. Counts and filters apply to this loaded view.` : `All ${count} reports are loaded.`}</p><button type="button" className="btn btn--ghost" aria-disabled={!hasMore} onClick={() => { if (hasMore) loadMore?.(); }}>{hasMore ? order === 'oldest' ? 'Load 50 newer reports' : 'Load 50 older reports' : 'All reports loaded'}</button></div>;
}
