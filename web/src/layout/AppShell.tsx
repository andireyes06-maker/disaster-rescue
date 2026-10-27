import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, ChartNoAxesCombined, History, Users, ShieldCheck, Settings, ClipboardList, MapPin, LogOut, ChevronDown, UserRound, type LucideIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import type { Role } from '../types/domain';
import NotificationBell from '../features/resident/NotificationBell';
import ChangePassword from '../features/account/ChangePassword';
import Banner from '../components/calm/Banner';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../components/ui/dialog';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Partial<Record<Role, NavItem[]>> = {
  // Admins hold every staff permission, so they see every staff page plus Admin.
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/map', label: 'Map', icon: Map },
    { to: '/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
    { to: '/audit', label: 'Audit', icon: History },
    { to: '/teams', label: 'Teams', icon: ShieldCheck },
    { to: '/users', label: 'Users', icon: Users },
    { to: '/admin', label: 'Admin', icon: Settings },
  ],
  // Rescuers use the website for their team's assignments and closed reports. They record field progress in the mobile app or on this website.
  responder: [
    { to: '/assignments', label: 'Assignments', icon: ClipboardList },
  ],
};

const DESCRIPTIONS: Record<string, string> = {
  Dashboard: 'Review incoming reports and coordinate the next response.',
  Map: 'Locate reported incidents and open a report for details.',
  Analytics: 'Review incident patterns for a selected reporting period.',
  'Audit log': 'Review who changed a report, what changed, and when.',
  Teams: 'Manage rescue teams and see their current availability.',
  Users: 'Manage staff access and team membership.',
  Assignments: 'Review your team’s incidents and record rescue progress.',
  Admin: 'Manage service settings and account access roles.',
  'Incident details': 'Review the report, its evidence, and the response history.',
};

interface AppShellProps {
  title: string;
  children?: ReactNode;
}

export default function AppShell({ title, children }: AppShellProps) {
  const { user, role, logout } = useAuth();
  const items = (role && NAV[role]) || [];
  const PageIcon = title === 'Incident details' || title === 'Assignment' ? MapPin : items.find(item => item.label === title || (title === 'Audit log' && item.to === '/audit'))?.icon || Settings;
  const [menuOpen, setMenuOpen] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const { pathname } = useLocation();
  async function onSignOut() {
    setSignOutError('');
    try {
      await logout();
    } catch {
      setSignOutError('Could not sign out. Check your connection and try again.');
    }
  }
  useEffect(() => { document.title = `${title} · I-Report`; }, [title]);
  return (
    <div className="shell" data-workspace={role}>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <aside className={`shell__side${menuOpen ? ' is-open' : ''}`}>
        <div className="shell__sidehead">
          <div className="shell__brand"><img className="shell__logo" src="/brand/ireport-logo-dark.png" alt="I-Report" width="200" height="72" /></div>
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
          {items.map((i) => {
            const contextActive = pathname.startsWith('/incidents/') && i.to === '/dashboard';
            const Icon = i.icon;
            return <NavLink key={i.to} to={i.to} onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `navlink${isActive || contextActive ? ' active' : ''}`}>
              <Icon size={17} aria-hidden="true" />{i.label}
            </NavLink>;
          })}
        </nav>
        <div className="shell__side-footer"><p className="shell__side-note">Disaster reporting &amp; monitoring</p><button type="button" className="sidebar-signout" onClick={onSignOut}><LogOut size={17} aria-hidden="true" />Sign out</button></div>
      </aside>
      <div className="shell__body">
        <header className="shell__top">
          <div className="shell__account">
          <Dialog>
            <DialogTrigger asChild><button type="button" className="profile-trigger" aria-label={`Open profile for ${user?.displayName || user?.email || 'your account'}`}><span className="account-avatar" aria-hidden="true">{(user?.displayName || user?.email || 'R').slice(0, 1).toUpperCase()}</span><span>{user?.displayName || user?.email}</span><ChevronDown size={15} aria-hidden="true" /></button></DialogTrigger>
            <DialogContent className="profile-dialog"><DialogTitle>Your profile</DialogTitle><DialogDescription>Review your account and manage your password.</DialogDescription><section className="profile-identity"><UserRound size={25} aria-hidden="true" /><div><strong>{user?.displayName || user?.email}</strong><p>{user?.email}</p><span className="badge badge--neutral">{role === 'admin' ? 'Administrator' : role === 'responder' ? 'Rescuer' : role}</span></div></section><details className="profile-password"><summary>Change password</summary><ChangePassword embedded /></details></DialogContent>
          </Dialog>
          {user && <NotificationBell key={user.uid} uid={user.uid} reportHref={(id) => role === 'responder' ? `/assignments/${encodeURIComponent(id)}` : `/incidents/${encodeURIComponent(id)}`} />}
          </div>
        </header>
        <main className="shell__main" id="main-content" tabIndex={-1}>
          {signOutError && <Banner tone="error" role="alert">{signOutError}</Banner>}
          <div className={`page-band${title === 'Incident details' || title === 'Assignment' ? ' page-band--incident' : ''}`}>
            <span className="page-band__icon" aria-hidden="true"><PageIcon size={26} /></span>
            <div><h1>{title}</h1><p className="shell__description">{DESCRIPTIONS[title]}</p></div>
          </div>
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
