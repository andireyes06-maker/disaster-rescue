import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import IncidentDetails from '../reports/IncidentDetails';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';

// Bounded dialog with a persistent close control, focus trap and focus return.
export default function IncidentModal({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const content = useRef<HTMLDivElement>(null);
  const trigger = useRef(document.activeElement as HTMLElement | null);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent ref={content} onEscapeKeyDown={event => { const dialogs = Array.from(document.querySelectorAll('[data-slot="dialog-content"][data-state="open"]')); if (dialogs.length && dialogs[dialogs.length - 1] !== content.current) event.preventDefault(); }} className="incident-modal__panel incident-modal__panel--detail" showCloseButton={false} aria-describedby={undefined} onCloseAutoFocus={event => { event.preventDefault(); if (trigger.current?.isConnected) trigger.current.focus(); }}>
      <header className="incident-modal__header"><DialogTitle>Incident details</DialogTitle><div className="incident-modal__actions"><Link className="btn btn--ghost" to={`/incidents/${encodeURIComponent(reportId)}`}>Open full report</Link><button type="button" className="btn btn--ghost" onClick={onClose} aria-label="Close incident details"><X size={18} aria-hidden="true" /></button></div></header>
      <div className="incident-modal__body"><IncidentDetails reportId={reportId} /></div>
    </DialogContent>
  </Dialog>;
}
