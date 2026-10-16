import type { ReactNode } from 'react';

export default function Card({ as: Tag = 'div', children, className = '' }: {
  as?: 'section' | 'article' | 'div';
  children: ReactNode;
  className?: string;
}) {
  return <Tag className={`calm-card ${className}`.trim()}>{children}</Tag>;
}
