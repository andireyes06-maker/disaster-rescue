import type { ReactNode } from 'react';

export default function Banner({ tone, title, children, role }: {
  tone: 'info' | 'notice' | 'error';
  title?: string;
  children: ReactNode;
  role?: 'alert' | 'status';
}) {
  return (
    <div className={`calm-banner calm-banner--${tone}`} role={role}>
      {title && <p className="calm-banner__title">{title}</p>}
      <div>{children}</div>
    </div>
  );
}
