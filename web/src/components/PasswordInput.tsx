import { useState, type ComponentPropsWithoutRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput(props: Omit<ComponentPropsWithoutRef<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);
  const label = props.id === 'confirmPassword' ? 'confirmation password' : 'password';
  return <div className="password-control">
    <input {...props} type={visible ? 'text' : 'password'} />
    <button type="button" aria-label={`Show ${label}`} aria-pressed={visible} onClick={() => setVisible(value => !value)}>
      {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  </div>;
}
