import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import TypeLegend from './TypeLegend';

describe('TypeLegend', () => {
  it('lists all 8 types, in order, each with an icon and its label', () => {
    render(<TypeLegend />);
    const items = within(screen.getByRole('list', { name: 'Emergency types' })).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual(['Flood', 'Fire', 'Earthquake', 'Landslide', 'Lifeline', 'Roadblock', 'Live Wire', 'Other']);
    for (const li of items) expect(li.querySelector('svg')).not.toBeNull();
  });
  it('shows the Type label', () => {
    render(<TypeLegend />);
    expect(screen.getByText('Type')).toBeInTheDocument();
  });
  it('is a legend, not a control', () => {
    const { container } = render(<TypeLegend />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(container.querySelector('button, a, input, select, [tabindex]')).toBeNull();
  });
});
