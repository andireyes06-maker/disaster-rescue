import type { ComponentPropsWithoutRef } from 'react';
import { CircleAlert } from 'lucide-react';

// Replaced copy gets a fresh entrance; resolved errors leave the accessible tree immediately.
export default function FieldError({ children, className = '', ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p key={typeof children === 'string' ? children : undefined} {...props} className={`field-error ${className}`.trim()}><CircleAlert size={16} aria-hidden="true" focusable="false" />{children}</p>;
}
