import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';

const NAV = {
  dispatcher: [{ to: '/dashboard', label: 'Dashboard' }],
  dmo: [{ to: '/monitor', label: 'Monitor' }],
  responder: [{ to: '/assignments', label: 'Assignments' }],
};

export default function AppShell({ title, children }) {
  const { user, role, logout } = useAuth();
  const items = NAV[role] || [];
  return (
    <div className="shell">
      <aside className="shell__side">
        <p className="shell__brand">Rescue Reports</p>
        <nav aria-label="Main">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} className="navlink">{i.label}</NavLink>
          ))}
        </nav>
      </aside>
      <div className="shell__body">
        <header className="shell__top">
          <span>{user?.displayName || user?.email} ({role})</span>
          <button type="button" className="btn btn--ghost" onClick={() => logout().catch(() => {})}>Sign out</button>
        </header>
        <main className="shell__main">
          <h1>{title}</h1>
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
