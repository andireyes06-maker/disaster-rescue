import IncidentMap from '../map/IncidentMap';
import { Eye } from 'lucide-react';

// Read-only for the DMO: the map and filters only. No action controls.
export default function MonitorPage() {
  return (
    <section aria-label="Incident monitor">
      <div className="monitor-context"><Eye size={19} aria-hidden="true" /><div><strong>Area overview</strong><p>Read-only view. Select a marker to open the incident details.</p></div></div>
      <IncidentMap />
    </section>
  );
}
