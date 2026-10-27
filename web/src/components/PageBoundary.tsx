import { Component, createRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Brand from './Brand';
import { CircleAlert } from 'lucide-react';

// A failed route download must leave a recovery path instead of a blank app.
export default class PageBoundary extends Component<{ resetKey: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  private fallback = createRef<HTMLElement>();
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() {
    document.title = 'Page unavailable · I-Report';
    this.fallback.current?.focus();
  }
  componentDidUpdate(previous: Readonly<{ resetKey: string; children: ReactNode }>) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="page-failure" id="main-content" ref={this.fallback} tabIndex={-1}>
      <Brand />
      <CircleAlert size={36} color="var(--color-critical)" aria-hidden="true" focusable="false" />
      <h1>Page unavailable</h1>
      <p>The page could not be loaded. Check your connection, then reload or return to the start.</p>
      <div><button className="btn" type="button" onClick={() => window.location.reload()}>Reload page</button><Link className="service-text-link" to="/">Return to start</Link></div>
    </main>;
  }
}
