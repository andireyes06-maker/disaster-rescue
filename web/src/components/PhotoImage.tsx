import { useState } from 'react';

// A report photo that stays readable when the file cannot be loaded: a plain message instead of an empty frame.
export default function PhotoImage({ src, className }: { src: string; className?: string }) {
  return <PhotoContent key={src} src={src} className={className} />;
}

function PhotoContent({ src, className }: { src: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="photo-missing">Photo could not be loaded</span>;
  return <img src={src} alt="" loading="lazy" className={className} onError={() => setFailed(true)} />;
}
