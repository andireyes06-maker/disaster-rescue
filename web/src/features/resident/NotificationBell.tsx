import FieldError from '../../components/FieldError';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Popover } from 'radix-ui';
import { Bell, Check, X } from 'lucide-react';
import { api } from '../../api/client';
import { Skeleton, SkeletonRows } from '../../components/calm/Skeleton';
import { useMyNotifications } from './useMyNotifications';
import { formatTime } from '../reports/format';
import './notifications.css';

const residentReportHref = (id: string) => `/my/reports/${encodeURIComponent(id)}`;

export default function NotificationBell({ uid, reportHref = residentReportHref }: { uid: string; reportHref?: (reportId: string) => string }) {
  const { notifications, loading, error, windowSize, loadMore } = useMyNotifications(uid);
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const pendingRef = useRef(new Set<string>());
  const [saveError, setSaveError] = useState('');
  // Focus moves to the bell when Escape or the close button starts the exit, not after the exit ends.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Reopening during the exit reuses the mounted panel, so Radix does not move focus into it. Move it explicitly.
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('.notification-panel__close')?.focus();
  }, [open]);
  const unread = notifications.filter((n) => !n.read && !readIds.has(n.id)).length;

  async function markRead(id: string) {
    if (pendingRef.current.has(id)) return;
    pendingRef.current.add(id);
    setSaveError('');
    setPendingIds((ids) => new Set(ids).add(id));
    try {
      await api(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.dataset.notificationRead === id) {
        panelRef.current?.querySelector<HTMLButtonElement>('.notification-panel__close')?.focus();
      }
      setReadIds((ids) => new Set(ids).add(id));
    } catch {
      setSaveError('Could not mark the notification as read. Try again.');
    } finally {
      pendingRef.current.delete(id);
      setPendingIds((ids) => { const next = new Set(ids); next.delete(id); return next; });
    }
  }

  return <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Trigger asChild>
      <button ref={triggerRef} type="button" className="notification-bell" aria-label={error ? 'Notifications, unavailable' : `Notifications${unread ? `, ${unread} unread` : ''}`}>
        <Bell size={20} aria-hidden="true" />
        {unread > 0 && <span key={unread} className="notification-bell__count" aria-hidden="true">{unread > 99 ? '99+' : unread}</span>}
        {error && <span className="notification-bell__error" aria-hidden="true">!</span>}
      </button>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content ref={panelRef} className="notification-panel" align="end" sideOffset={12} collisionPadding={12} aria-labelledby="notification-panel-title"
        onEscapeKeyDown={() => triggerRef.current?.focus()}>
        <div className="notification-panel__header">
          <div><h2 id="notification-panel-title">Notifications</h2><p>{error ? 'Updates are unavailable' : loading ? 'Checking for updates…' : unread ? `${unread} unread` : 'You’re all caught up'}</p></div>
          <Popover.Close className="notification-panel__close" aria-label="Close notifications" onClick={() => triggerRef.current?.focus()}><X size={19} aria-hidden="true" /></Popover.Close>
        </div>
        {error && <FieldError className="notification-panel__message" role="alert">Could not load notifications. Check your connection. Updates will appear when the connection recovers.</FieldError>}
        {saveError && <FieldError className="notification-panel__message" role="alert">{saveError}</FieldError>}
        <div className="notification-panel__scroll">
          {loading && !error && notifications.length === 0 && <Skeleton label="Loading notifications"><SkeletonRows rows={3} height={64} /></Skeleton>}
          {!loading && !error && notifications.length === 0 && <div className="notification-panel__empty"><Bell size={28} aria-hidden="true" /><h3>No notifications yet</h3><p>Updates about your reports will appear here.</p></div>}
          {notifications.length > 0 && <ul className="notification-panel__list">{notifications.map((n) => {
            const isUnread = !n.read && !readIds.has(n.id);
            return <li key={n.id} className={isUnread ? 'is-unread' : undefined}>
              <span className="notification-panel__dot" aria-hidden="true" />
              <div className="notification-panel__text">
                {isUnread && <span className="visually-hidden">Unread: </span>}<strong>{n.title}</strong><p>{n.body}</p><time dateTime={n.createdAt.toISOString()}>{formatTime(n.createdAt)}</time>
                <div className="notification-panel__actions">
                  {n.reportId && <Link to={reportHref(n.reportId)} onClick={() => setOpen(false)}>View report</Link>}
                  {isUnread && <button type="button" onClick={() => void markRead(n.id)} data-notification-read={n.id} aria-disabled={pendingIds.has(n.id)} aria-busy={pendingIds.has(n.id)} aria-label={`Mark as read: ${n.title}`}><Check size={14} aria-hidden="true" />{pendingIds.has(n.id) ? 'Saving…' : 'Mark as read'}</button>}
                </div>
              </div>
            </li>;
          })}</ul>}
        {windowSize && notifications.length >= windowSize && !loading && !error && <div className="notification-panel__message"><p>Unread count covers the {notifications.length} loaded notifications.</p>{notifications.length >= windowSize && <button type="button" className="btn btn--ghost" onClick={loadMore}>Load 50 older notifications</button>}</div>}
        </div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>;
}
