import type { ReactNode } from 'react';

// The role sits on the element that holds the message text, so role queries find the text.
export default function Banner({ tone, title, children, role }: {
  tone: 'info' | 'notice' | 'error';
  title?: string;
  children: ReactNode;
  role?: 'alert' | 'status';
}) {
  return (
    <div className={`calm-banner calm-banner--${tone}`} role={role}>
      {title && <p className="calm-banner__title">{title}</p>}
      {children}
    </div>
  );
}
