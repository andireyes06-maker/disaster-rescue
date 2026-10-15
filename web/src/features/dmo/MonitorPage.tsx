import IncidentMap from '../map/IncidentMap';

// Read-only for the DMO: the map and filters only. No action controls.
export default function MonitorPage() {
  return (
    <section aria-label="Incident monitor">
      <p>Read-only view. Select a marker to open the incident details.</p>
      <IncidentMap />
    </section>
  );
}
