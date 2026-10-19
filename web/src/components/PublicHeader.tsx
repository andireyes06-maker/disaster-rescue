import { useEffect, useRef, type ReactNode } from 'react';
import Brand from './Brand';
import { Info } from 'lucide-react';

export interface PublicHeaderLink {
  href: string;
  label: string;
}

interface PublicHeaderProps {
  links?: PublicHeaderLink[];
  action?: ReactNode;
  description?: string;
}

export default function PublicHeader({ links = [], action, description }: PublicHeaderProps) {
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = header.current;
    const page = element?.parentElement;
    if (!element || !page?.classList.contains('service-site')) return;
    const update = () => {
      const height = element.getBoundingClientRect().height;
      if (height) page.style.setProperty('--public-header-offset', `${height + 24}px`);
    };
    update();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : undefined;
    observer?.observe(element);
    return () => { observer?.disconnect(); page.style.removeProperty('--public-header-offset'); };
  }, []);
  return (
    <header className="public-header" ref={header}>
      <div className={`public-header__inner${links.length ? ' has-navigation' : ''}`}>
        <a className="public-header__brand" href="/">
          <Brand />
          {description && <span className="public-header__description">{description}</span>}
        </a>
        {links.length > 0 && (
          <nav className="public-header__nav" aria-label="Page sections">
            {links.map((link) => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
          </nav>
        )}
        {action && <div className="public-header__action">{action}</div>}
      </div>
      <div className="public-header__notice">
        <span><Info size={14} aria-hidden="true" />Report incidents. Follow response updates.</span>
      </div>
    </header>
  );
}
