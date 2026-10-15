import AppShell from '../layout/AppShell';

interface PlaceholderProps {
  title: string;
}

export default function Placeholder({ title }: PlaceholderProps) {
  return (
    <AppShell title={title}>
      <div className="card"><p>Nothing to show yet.</p></div>
    </AppShell>
  );
}
