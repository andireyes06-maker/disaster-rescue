import { useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import type { Role } from '../types/domain';

interface NavItem {
  to: string;
  label: string;
}

const NAV: Partial<Record<Role, NavItem[]>> = {
  dispatcher: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/map', label: 'Map' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/audit', label: 'Audit' },
    { to: '/teams', label: 'Teams' },
    { to: '/users', label: 'Users' },
  ],
  dmo: [
    { to: '/monitor', label: 'Monitor' },
    { to: '/analytics', label: 'Analytics' },
  ],
  responder: [{ to: '/assignments', label: 'Assignments' }],
};

interface AppShellProps {
  title: string;
  children?: ReactNode;
}

export default function AppShell({ title, children }: AppShellProps) {
  const { user, role, logout } = useAuth();
  const items = (role && NAV[role]) || [];
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="shell">
      <aside className={`shell__side${menuOpen ? ' is-open' : ''}`}>
        <div className="shell__sidehead">
          <p className="shell__brand">Rescue Reports</p>
          <button
            type="button"
            className="shell__menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="main-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
        </div>
        <nav aria-label="Main" id="main-nav">
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
