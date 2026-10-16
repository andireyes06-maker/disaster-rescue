import { useEffect, useState } from 'react';
import { api } from '../../api/client';

interface Health { api: string; firestore: string; checkedAt: string }

export default function HealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api('/admin/health')
      .then((res) => setHealth(res as Health))
      .catch(() => setFailed(true));
  }, []);
  if (failed) return <p role="alert">Could not check system health.</p>;
  if (!health) return <p role="status">Checking system health...</p>;
  return (
    <ul className="admin-health">
      <li>API: {health.api}</li>
      <li>Database: {health.firestore}</li>
      <li>Checked {new Date(health.checkedAt).toLocaleString()}</li>
    </ul>
  );
}
