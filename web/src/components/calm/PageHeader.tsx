import type { ReactNode } from 'react';

export default function PageHeader({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="calm-page-header">
      <h1>{title}</h1>
      {actions && <div className="calm-page-header__actions">{actions}</div>}
    </div>
  );
}
