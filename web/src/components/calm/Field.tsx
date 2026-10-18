import type { ReactNode } from 'react';
import FieldError from '../FieldError';

export default function Field({ label, id, error, children }: {
  label: string;
  id: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="calm-field">
      <label htmlFor={id} className="calm-field__label">{label}</label>
      {children}
      {error && <FieldError className="calm-field__error" id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}
