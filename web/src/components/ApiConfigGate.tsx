import type { ReactNode } from 'react';
import { resolveApiBaseUrl } from '../api/config';

// Shows a configuration error instead of the app when the API address is missing or invalid.
export default function ApiConfigGate({ value, children }: { value: string | undefined; children: ReactNode }) {
  const resolved = resolveApiBaseUrl(value);
  if (resolved.ok) return <>{children}</>;
  return (
    <main className="login" id="main-content" tabIndex={-1}>
      <div className="card login__card">
        <h1>The app cannot reach its server</h1>
        <p>{resolved.reason}</p>
        <p>
          Set <code>VITE_API_BASE_URL</code> in <code>web/.env.local</code> to the address of the API, then restart the
          dev server. The local setup is described in <code>web/.env.example</code>.
        </p>
      </div>
    </main>
  );
}
