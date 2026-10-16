const HOTLINE_PLACEHOLDER = '000-0000';

export default function PublicHeader() {
  return (
    <header className="public-header">
      <a className="public-header__brand" href="/">
        <span className="public-header__mark" aria-hidden="true">DR</span>
        <span>Disaster Rescue</span>
      </a>
      <a className="public-header__hotline" href={`tel:${HOTLINE_PLACEHOLDER}`}>
        Emergency hotline (placeholder)
      </a>
    </header>
  );
}
