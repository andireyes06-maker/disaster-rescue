import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhotoImage from './PhotoImage';

describe('PhotoImage', () => {
  it('shows the photo when it loads', () => {
    const { container } = render(<PhotoImage src="/photo.png" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/photo.png');
  });

  it('replaces a photo that fails to load with a readable message', () => {
    const { container } = render(<PhotoImage src="/missing.png" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('Photo could not be loaded')).toBeInTheDocument();
  });

  it('tries a replacement URL after the original photo failed', () => {
    const { container, rerender } = render(<PhotoImage src="/missing.png" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    rerender(<PhotoImage src="/replacement.png" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/replacement.png');
    expect(screen.queryByText('Photo could not be loaded')).not.toBeInTheDocument();
  });
});
