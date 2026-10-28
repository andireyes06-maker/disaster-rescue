import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('shows initials when there is no photo', () => {
    const { container } = render(<Avatar name="Maria Santos Cruz" photoUrl={null} />);
    expect(screen.getByText('MS')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  it('shows the photo when there is one, as decoration next to the name', () => {
    const { container } = render(<Avatar name="Maria Santos" photoUrl="https://res.cloudinary.com/demo/me.jpg" />);
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', 'https://res.cloudinary.com/demo/me.jpg');
    expect(img).toHaveAttribute('alt', '');
    expect(screen.queryByText('MS')).toBeNull();
  });

  it('falls back to initials when the image fails to load', () => {
    const { container } = render(<Avatar name="Maria Santos" photoUrl="https://res.cloudinary.com/demo/broken.jpg" />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('shows a neutral icon when there is no name and no photo', () => {
    const { container } = render(<Avatar name="" photoUrl={null} />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.textContent).toBe('');
  });
});
