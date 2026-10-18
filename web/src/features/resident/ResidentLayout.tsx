import { useEffect, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { confirmLeave, UnsavedChangesProvider, useUnsavedChanges } from './UnsavedChanges';
import '../../pages/public.css';

// Header and navigation for resident pages. Staff navigation is not shown to residents.
interface ResidentLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function ResidentLayout(props: ResidentLayoutProps) {
  // The provider sits above the page content so the report form can report unsent input to the navigation (F06).
  return (
    <UnsavedChangesProvider>
      <ResidentLayoutFrame {...props} />
    </UnsavedChangesProvider>
  );
}

function ResidentLayoutFrame({ title, description, children }: ResidentLayoutProps) {
  const { user, logout } = useAuth();
  const { dirty } = useUnsavedChanges();
  // The browser title names the page the resident is on (W12).
  useEffect(() => { document.title = `${title} · Rescue Reports`; }, [title]);
  return (
    <div className="resident-layout">
      <header className="resident-layout__top">
        <p className="resident-layout__brand">Rescue Reports</p>
        <a className="skip-link" href="#resident-main">Skip to content</a>
        <nav aria-label="Resident" className="resident-layout__nav">
          <NavLink to="/my" end onClick={(e) => { if (!confirmLeave(dirty)) e.preventDefault(); }}>My reports</NavLink>
          <NavLink to="/my/report" onClick={(e) => { if (!confirmLeave(dirty)) e.preventDefault(); }}>Report an emergency</NavLink>
        </nav>
        <div className="resident-layout__account">
          <span>{user?.email}</span>
          <button type="button" className="btn btn--ghost"
            onClick={() => { if (confirmLeave(dirty)) logout().catch(() => {}); }}>Sign out</button>
        </div>
      </header>
      <header className="page-band resident-band">
        <div className="resident-band__inner">
          <h1>{title}</h1>
          <p className="shell__description">{description}</p>
        </div>
      </header>
      <div className="resident__body" id="resident-main" tabIndex={-1}>{children}</div>
    </div>
  );
}
