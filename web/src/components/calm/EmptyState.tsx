import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title, body, action }: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <section className="calm-empty">
      <span className="calm-empty__symbol" aria-hidden="true"><Inbox size={27} /></span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}
