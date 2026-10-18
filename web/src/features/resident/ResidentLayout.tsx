import { useEffect, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthProvider';
import { ClipboardList, LogOut, Plus, ShieldCheck } from 'lucide-react';
import Brand from '../../components/Brand';
import NotificationBell from './NotificationBell';
import '../../pages/public.css';

// Header and navigation for resident pages. Staff navigation is not shown to residents.
interface ResidentLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

export default function ResidentLayout({ title, description, children }: ResidentLayoutProps) {
  const { user, logout } = useAuth();
  // The browser title names the page the resident is on (W12).
  useEffect(() => { document.title = `${title} · Rescue Reports`; }, [title]);
  return (
    <div className="resident-layout">
      <a className="skip-link" href="#resident-main">Skip to content</a>
      <header className="resident-layout__top">
        <NavLink className="resident-layout__brand" to="/my" aria-label="Rescue Reports home"><Brand /></NavLink>
        <nav aria-label="Resident" className="resident-layout__nav">
          <NavLink to="/my" end><ClipboardList size={17} aria-hidden="true" />My reports</NavLink>
          <NavLink to="/my/report"><Plus size={18} aria-hidden="true" />Report an emergency</NavLink>
        </nav>
        <div className="resident-layout__account">
          <NotificationBell key={user?.uid ?? ''} uid={user?.uid ?? ''} />
          <span className="account-avatar" aria-hidden="true">{(user?.displayName || user?.email || 'R').slice(0, 1).toUpperCase()}</span>
          <span>{user?.displayName || user?.email}</span>
          <button type="button" className="btn btn--ghost" onClick={() => logout().catch(() => {})}><LogOut size={16} aria-hidden="true" />Sign out</button>
        </div>
      </header>
      <main id="resident-main" tabIndex={-1} className="resident__main">
        <div className="resident-band">
          <div className="resident-band__inner">
            <h1>{title}</h1>
            <p className="shell__description">{description}</p>
          </div>
        </div>
        <div className="resident__body">{children}</div>
      </main>
      <footer className="resident-footer"><ShieldCheck size={16} aria-hidden="true" /><span>Rescue Reports · Incident reporting and response coordination</span></footer>
    </div>
  );
}
