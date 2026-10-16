import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import '../../pages/public.css';

// Header and navigation for resident pages. Staff navigation is not shown to residents.
interface ResidentLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function ResidentLayout({ title, description, children }: ResidentLayoutProps) {
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
      <header className="page-band resident-band">
        <div className="resident-band__inner">
          <h1>{title}</h1>
          <p className="shell__description">{description}</p>
        </div>
      </header>
      <div className="resident__body">{children}</div>
    </div>
  );
}
