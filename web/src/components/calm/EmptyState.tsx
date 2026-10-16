import type { ReactNode } from 'react';

export default function EmptyState({ title, body, action }: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <section className="calm-empty">
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}
