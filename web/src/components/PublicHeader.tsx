export default function PublicHeader() {
  return (
    <header className="public-header">
      <a className="public-header__brand" href="/">
        <span className="public-header__mark" aria-hidden="true">DR</span>
        <span>Disaster Rescue</span>
      </a>
      <span className="public-header__notice">Demo site · hotline not configured</span>
    </header>
  );
}
