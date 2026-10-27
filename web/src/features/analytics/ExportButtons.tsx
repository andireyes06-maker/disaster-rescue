import { useRef, useState } from 'react';
import { apiFile } from '../../api/client';
import Banner from '../../components/calm/Banner';

export interface ExportFilters {
  from: string;
  to: string;
  type: string;
  status: string;
}

// Only non-empty filters go into the query string.
export function buildExportQuery(f: ExportFilters): string {
  const params = new URLSearchParams();
  for (const key of ['from', 'to', 'type', 'status'] as const) {
    if (f[key]) params.set(key, f[key]);
  }
  return params.toString();
}

interface ExportButtonsProps {
  filters: ExportFilters;
}

export default function ExportButtons({ filters }: ExportButtonsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function download(endpoint: string, filename: string) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    const query = buildExportQuery(filters);
    setBusy(filename);
    setError(null);
    try {
      // The token travels in the Authorization header; only the filters are in the URL.
      // The server names demo exports "demo-sample-…" so they cannot pass for operational data.
      const file = await apiFile(`/export/${endpoint}${query ? `?${query}` : ''}`);
      const url = URL.createObjectURL(file.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename ?? filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setError('Could not download the file. Check your connection and try again.');
    } finally {
      pendingRef.current = false;
      setBusy(null);
    }
  }

  return (
    <div className="export-row" role="group" aria-label="Export reports">
      <button type="button" className="btn btn--ghost" aria-disabled={busy !== null} aria-busy={busy === 'incidents.csv'} onClick={() => download('incidents.csv', 'incidents.csv')}>
        Download CSV
      </button>
      <button type="button" className="btn btn--ghost" aria-disabled={busy !== null} aria-busy={busy === 'summary.pdf'} onClick={() => download('summary.pdf', 'summary.pdf')}>
        Download PDF
      </button>
      {error && <Banner tone="error" role="alert">{error}</Banner>}
    </div>
  );
}
