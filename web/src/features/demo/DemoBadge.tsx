// Shown on every shell page while the demo workspace is active, so sample data is never mistaken for live reports.
export default function DemoBadge({ label }: { label: string }) {
  return <span className="demo-badge">{label}</span>;
}
