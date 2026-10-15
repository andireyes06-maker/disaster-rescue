import AppShell from '../layout/AppShell.jsx';

export default function Placeholder({ title }) {
  return (
    <AppShell title={title}>
      <div className="card"><p>Nothing to show yet.</p></div>
    </AppShell>
  );
}
