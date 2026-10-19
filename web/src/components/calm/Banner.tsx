import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { useMessageMotion } from '../useMessageMotion';

// The role sits on the element that holds the message text, so role queries find the text.
export default function Banner({ tone, title, children, role, id }: {
  id?: string;
  tone: 'info' | 'notice' | 'error';
  title?: string;
  children: ReactNode;
  role?: 'alert' | 'status';
}) {
  const ref = useMessageMotion();
  return (
    <div id={id} ref={ref} className={`calm-banner calm-banner--${tone}`} role={role}>
      {tone === 'error' && <CircleAlert className="calm-banner__error-icon" size={20} aria-hidden="true" focusable="false" />}
      {title && <p className="calm-banner__title">{title}</p>}
      {children}
    </div>
  );
}
