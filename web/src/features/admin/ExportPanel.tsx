import { useState } from 'react';
import { apiDownload } from '../../api/client';
import Banner from '../../components/calm/Banner';

// Totals only. Incident CSV exports with exact locations are not offered to admins.
export default function ExportPanel() {
  const [error, setError] = useState('');
  async function download() {
    setError('');
    try {
      await apiDownload('/export/summary.pdf', 'summary.pdf');
    } catch {
      setError('Could not download the summary. Try again.');
    }
  }
  return (
    <div>
      {error && <Banner tone="error" role="alert"><strong>Problem:</strong> <span>{error}</span></Banner>}
      <button type="button" className="btn" onClick={download}>Download summary (PDF)</button>
    </div>
  );
}
