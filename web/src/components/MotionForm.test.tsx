import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MotionForm from './MotionForm';
import FieldError from './FieldError';
import Banner from './calm/Banner';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup(reduced = false) {
  const preference = { matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', () => preference);
  const cancel = vi.fn();
  const animate = vi.fn<typeof Element.prototype.animate>(() => ({ cancel }) as unknown as Animation);
  const original = Element.prototype.animate;
  Element.prototype.animate = animate;
  return { animate, cancel, preference, restore: () => { Element.prototype.animate = original; } };
}

function Example({ error = '' }: { error?: string }) {
  return <MotionForm aria-label="Example"><label htmlFor="draft">Name</label><input id="draft" defaultValue="Kept" aria-invalid={!!error} aria-describedby={error ? 'draft-error' : undefined} />{error && <FieldError id="draft-error">{error}</FieldError>}<button>Submit</button></MotionForm>;
}

describe('Form feedback motion', () => {
  it('does not move controls through new or removed errors, keeping values, focus, and validation semantics', () => {
    const h = setup(); let buttonY = 100;
    try {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) { return { left: 0, top: this.tagName === 'BUTTON' ? buttonY : 0, height: 40, width: 100 } as DOMRect; });
      const view = render(<Example />);
      screen.getByLabelText('Name').focus();
      buttonY = 130; view.rerender(<Example error="Enter your name." />);
      expect(h.animate).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Name')).toHaveFocus();
      expect(screen.getByLabelText('Name')).toHaveValue('Kept');
      expect(screen.getByLabelText('Name')).toHaveAttribute('aria-describedby', 'draft-error');
      buttonY = 100; view.rerender(<Example />);
      expect(screen.queryByText('Enter your name.')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-describedby');
      expect(h.animate).not.toHaveBeenCalled();
    } finally { h.restore(); }
  });

  it('keeps ordinary layout motion when validation feedback has not changed', () => {
    const h = setup(); let buttonY = 100;
    try {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) { return { left: 0, top: this.tagName === 'BUTTON' ? buttonY : 0, height: 40, width: 100 } as DOMRect; });
      const view = render(<Example />);
      buttonY = 130; view.rerender(<Example />);
      expect(h.animate.mock.calls[0][0]).toEqual([{ transform: 'translate(0px, -30px)' }, { transform: 'none' }]);
    } finally { h.restore(); }
  });

  it('measures every moving control before starting any animation', () => {
    const h = setup(); let offset = 0;
    const order: string[] = [];
    try {
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        order.push('read');
        return { left: 0, top: this.tagName === 'FORM' ? 0 : offset, height: 40, width: 100 } as DOMRect;
      });
      h.animate.mockImplementation(() => { order.push('animate'); return { cancel: h.cancel } as unknown as Animation; });
      const view = render(<Example />);
      order.length = 0; offset = 20; view.rerender(<Example />);
      expect(order).toContain('animate');
      expect(order.lastIndexOf('read')).toBeLessThan(order.indexOf('animate'));
    } finally { h.restore(); }
  });

  it('keeps validation immediate and does not animate layout with reduced motion', () => {
    const h = setup(true);
    try {
      const view = render(<Example />); view.rerender(<Example error="Enter your name." />);
      expect(screen.getByText('Enter your name.')).toBeInTheDocument();
      expect(h.animate).not.toHaveBeenCalled();
    } finally { h.restore(); }
  });

  it('animates changed banner copy without replacing its alert node', () => {
    const h = setup();
    try {
      const view = render(<Banner tone="error" role="alert">First failure</Banner>);
      const alert = screen.getByRole('alert');
      view.rerender(<Banner tone="error" role="alert">Try a different email</Banner>);
      expect(screen.getByRole('alert')).toBe(alert);
      expect(alert).toHaveTextContent('Try a different email');
      expect(h.animate).toHaveBeenCalledTimes(1);
    } finally { h.restore(); }
  });
});
