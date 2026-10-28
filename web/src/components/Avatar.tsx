import { useState } from 'react';
import { UserRound } from 'lucide-react';

interface AvatarProps {
  name?: string | null;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}

// Up to two letters from the first two words of a name ("Maria Santos Cruz" gives "MS").
export function initialsOf(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

// A person's mark: their photo when it loads, otherwise their initials, otherwise a neutral icon.
// It always sits next to the person's name, so it is decoration (empty alt, hidden from assistive tech).
// Without a size it fills its container (for example the account list's identity mark).
export default function Avatar({ name, photoUrl, size, className }: AvatarProps) {
  return <AvatarContent key={photoUrl ?? ''} name={name} photoUrl={photoUrl} size={size} className={className} />;
}

function AvatarContent({ name, photoUrl, size, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = initialsOf(name);
  const showPhoto = Boolean(photoUrl) && !failed;
  return (
    <span
      className={`avatar${className ? ` ${className}` : ''}`}
      data-photo={showPhoto ? 'true' : undefined}
      style={size ? { width: size, height: size, fontSize: Math.round(size * 0.38) } : undefined}
      aria-hidden="true"
    >
      {showPhoto
        ? <img src={photoUrl!} alt="" onError={() => setFailed(true)} />
        : initials || <UserRound size={size ? Math.round(size * 0.55) : 18} aria-hidden="true" />}
    </span>
  );
}
