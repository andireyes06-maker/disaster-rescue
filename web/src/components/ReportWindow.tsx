export default function ReportWindow({count, windowSize, loadMore}: {count: number; windowSize?: number; loadMore?: () => void}) {
  if (!windowSize || (windowSize === 50 && count < windowSize)) return null;
  const hasMore = count >= windowSize;
  return <div className="report-window"><p>{hasMore ? `Showing ${count} newest reports. Counts and filters apply to this loaded view.` : `All ${count} reports are loaded.`}</p><button type="button" className="btn btn--ghost" aria-disabled={!hasMore} onClick={() => { if (hasMore) loadMore?.(); }}>{hasMore ? 'Load 50 older reports' : 'All reports loaded'}</button></div>;
}
