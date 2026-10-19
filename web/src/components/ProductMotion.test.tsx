import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link } from 'react-router-dom';
import ProductMotion from './ProductMotion';

afterEach(() => vi.unstubAllGlobals());

function setup(reduced = false) {
  const cancel = vi.fn();
  const animate = vi.fn(() => ({ cancel }) as unknown as Animation);
  const preference = { matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => preference);
  const original = Element.prototype.animate;
  Element.prototype.animate = animate;
  return { animate, cancel, preference, restore: () => { Element.prototype.animate = original; } };
}

describe('ProductMotion', () => {
  it('animates navigation without remounting the workspace or losing form input', async () => {
    const h = setup();
    try {
      const user = userEvent.setup();
      render(<MemoryRouter initialEntries={['/my']}><ProductMotion /><Link to="/my/report">Next</Link><main className="resident__body"><input aria-label="Draft" defaultValue="Keep this" /></main></MemoryRouter>);
      expect(h.animate).toHaveBeenCalledTimes(1);
      await user.click(screen.getByRole('link', { name: 'Next' }));
      expect(h.animate).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText('Draft')).toHaveValue('Keep this');
      expect(h.cancel).toHaveBeenCalled();
    } finally { h.restore(); }
  });

  it('waits for lazy content before starting its entrance', async () => {
    const h = setup();
    try {
      const view = render(<MemoryRouter><ProductMotion /><p>Loading page</p></MemoryRouter>);
      expect(h.animate).not.toHaveBeenCalled();
      view.rerender(<MemoryRouter><ProductMotion /><main className="shell__main">Loaded</main></MemoryRouter>);
      await waitFor(() => expect(h.animate).toHaveBeenCalledTimes(1));
    } finally { h.restore(); }
  });

  it('does not start spatial animations with reduced motion', () => {
    const h = setup(true);
    try {
      render(<MemoryRouter><ProductMotion /><main className="resident__body">Ready</main></MemoryRouter>);
      expect(h.animate).not.toHaveBeenCalled();
      expect(screen.getByText('Ready')).toBeVisible();
    } finally { h.restore(); }
  });

  it('cancels active motion immediately when the preference changes', () => {
    const h = setup();
    try {
      render(<MemoryRouter><ProductMotion /><main className="shell__main">Ready</main></MemoryRouter>);
      const listener = h.preference.addEventListener.mock.calls[0][1] as () => void;
      h.preference.matches = true;
      listener();
      expect(h.cancel).toHaveBeenCalled();
    } finally { h.restore(); }
  });
});
