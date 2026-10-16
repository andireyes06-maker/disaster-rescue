import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import '../../pages/public.css';

// Header and navigation for resident pages. Staff navigation is not shown to residents.
export default function ResidentLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  return (
    <div className="resident-layout">
      <header className="resident-layout__top">
        <p className="resident-layout__brand">Rescue Reports</p>
        <nav aria-label="Resident" className="resident-layout__nav">
          <Link to="/my">My reports</Link>
          <Link to="/my/report">Report an emergency</Link>
        </nav>
        <div className="resident-layout__account">
          <span>{user?.email}</span>
          <button type="button" className="btn btn--ghost" onClick={() => logout().catch(() => {})}>Sign out</button>
        </div>
      </header>
      {children}
    </div>
  );
}
