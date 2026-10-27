import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import IncidentDetails from '../reports/IncidentDetails';

// The incident's full details over the map, so the person keeps their place on the map.
// Escape and the close button both dismiss it; focus moves into the dialog and returns to the marker's map on close.
export default function IncidentModal({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="incident-modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="incident-modal__panel" role="dialog" aria-modal="true" aria-labelledby="incident-modal-title">
        <header className="incident-modal__header">
          <h2 id="incident-modal-title">Incident details</h2>
          <div className="incident-modal__actions">
            <Link className="btn btn--ghost" to={`/incidents/${encodeURIComponent(reportId)}`}>Open full report</Link>
            <button ref={closeButton} type="button" className="btn btn--ghost" onClick={onClose} aria-label="Close incident details">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="incident-modal__body">
          <IncidentDetails reportId={reportId} />
        </div>
      </section>
    </div>
  );
}
