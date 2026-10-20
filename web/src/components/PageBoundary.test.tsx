import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PageBoundary from './PageBoundary';

const Broken = () => { throw new Error('route download failed'); };
afterEach(() => vi.restoreAllMocks());
describe('PageBoundary', () => {
  it('keeps a failed route recoverable and moves focus to its explanation', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<MemoryRouter><PageBoundary resetKey="/register"><Broken /></PageBoundary></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Page unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to start' })).toHaveAttribute('href', '/');
  });
  it('clears a failed route when navigation chooses another page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const view = render(<MemoryRouter><PageBoundary resetKey="/register"><Broken /></PageBoundary></MemoryRouter>);
    view.rerender(<MemoryRouter><PageBoundary resetKey="/"><h1>Start</h1></PageBoundary></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Start' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Page unavailable' })).toBeNull();
  });
});
